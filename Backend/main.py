import math
import io
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict
from ortools.sat.python import cp_model

from sqlalchemy import Column, Integer, String, Boolean, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

app = FastAPI(title="AcadFlow: AI Timetable Generator API")

# SQL Database Schema
DATABASE_URL = "sqlite:///./acadflow.db" 
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class SQLCourse(Base):
    __tablename__ = "courses"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    section = Column(String, index=True)
    hours = Column(Integer)
    is_lab = Column(Boolean, default=False)
    elective_group = Column(String, nullable=True)

class SQLTeacher(Base):
    __tablename__ = "teachers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

# Generate tables
Base.metadata.create_all(bind=engine)

# ==========================================
# 2. PYDANTIC MODELS (API Payloads)
# ==========================================

class Course(BaseModel):
    id: str  
    name: str
    teachers: List[str]
    section: str
    hours: int
    is_lab: bool = False
    elective_group: Optional[str] = None

class TimetableRequest(BaseModel):
    num_days: int = 6
    num_periods: int = 8  
    sections: List[str]
    teachers: List[str]
    rooms: List[str]
    courses: List[Course]

class ScheduledClass(BaseModel):
    day: int
    period: int
    room: str
    course_name: str
    teachers: List[str]
    is_recess: bool = False

class TimetableResponse(BaseModel):
    status: str
    schedule: Optional[Dict[str, List[ScheduledClass]]] = None
    message: str

class RescheduleRequest(BaseModel):
    current_schedule: Dict[str, List[ScheduledClass]]
    target_day: int 
    course: Course
    all_rooms: List[str]
    num_periods: int = 8

class ExportRequest(BaseModel):
    schedule: Dict[str, List[ScheduledClass]]
    num_days: int = 6
    num_periods: int = 8

# ==========================================
# 3. THE AI SOLVER CORE (OR-Tools)
# ==========================================

def generate_schedule(data: TimetableRequest) -> dict:
    model = cp_model.CpModel()
    schedule = {}
    recess = {}
    
    # 1. Initialize Variables
    for c in data.courses:
        for r_idx in range(len(data.rooms)):
            for d in range(data.num_days):
                for p in range(data.num_periods):
                    schedule[(c.id, r_idx, d, p)] = model.NewBoolVar(f"c{c.id}_r{r_idx}_d{d}_p{p}")

    for section in data.sections:
        for d in range(data.num_days):
            for p in range(data.num_periods):
                recess[(section, d, p)] = model.NewBoolVar(f"rec_{section}_d{d}_p{p}")

    # A. Recess & Anti-Fatigue Constraints
    for section in data.sections:
        sec_courses = [c.id for c in data.courses if c.section == section]
        
        for d in range(data.num_days):
            model.AddExactlyOne([recess[(section, d, 2)], recess[(section, d, 3)]])
            for p in range(data.num_periods):
                if p not in [2, 3]:
                    model.Add(recess[(section, d, p)] == 0)

            active_periods_vars = []
            for p in range(data.num_periods):
                period_active = model.NewBoolVar(f"sec_{section}_d{d}_p{p}_active_cutoff")
                total_classes_this_period = sum(
                    schedule[(c_id, r_idx, d, p)] 
                    for c_id in sec_courses for r_idx in range(len(data.rooms))
                )
                
                model.Add(total_classes_this_period == 0).OnlyEnforceIf(recess[(section, d, p)])
                model.Add(total_classes_this_period > 0).OnlyEnforceIf(period_active)
                model.Add(total_classes_this_period == 0).OnlyEnforceIf(period_active.Not())
                active_periods_vars.append(period_active)

            for p in range(6, data.num_periods):
                model.Add(active_periods_vars[p] == 0).OnlyEnforceIf(recess[(section, d, 2)])
            for p in range(7, data.num_periods):
                model.Add(active_periods_vars[p] == 0).OnlyEnforceIf(recess[(section, d, 3)])

    # B. Course Delivery & Continuous Lab Windows
    for c in data.courses:
        if not c.is_lab:
            model.Add(sum(
                schedule[(c.id, r_idx, d, p)] 
                for r_idx in range(len(data.rooms)) for d in range(data.num_days) for p in range(data.num_periods)
            ) == c.hours)
        else:
            lab_start = {}
            for r_idx in range(len(data.rooms)):
                for d in range(data.num_days):
                    for p in range(data.num_periods - 1):
                        lab_start[(r_idx, d, p)] = model.NewBoolVar(f"ls_{c.id}_r{r_idx}_d{d}_p{p}")

            model.AddExactlyOne(lab_start.values())

            for r_idx in range(len(data.rooms)):
                for d in range(data.num_days):
                    for p in range(data.num_periods):
                        starts_covering = []
                        if p < data.num_periods - 1: starts_covering.append(lab_start[(r_idx, d, p)])
                        if p > 0: starts_covering.append(lab_start[(r_idx, d, p-1)])
                        model.Add(schedule[(c.id, r_idx, d, p)] == sum(starts_covering))

    # C. Section Delivery & Parallel Electives
    for section in data.sections:
        sec_courses = [c for c in data.courses if c.section == section]
        groups = {}
        for c in sec_courses:
            grp = c.elective_group if c.elective_group else f"core_{c.id}"
            if grp not in groups: groups[grp] = []
            groups[grp].append(c.id)

        for d in range(data.num_days):
            for p in range(data.num_periods):
                group_active_vars = []
                for grp_name, course_ids in groups.items():
                    grp_active = model.NewBoolVar(f"sec_{section}_grp_{grp_name}_d{d}_p{p}")
                    group_active_vars.append(grp_active)
                    for cid in course_ids:
                        c_active = sum(schedule[(cid, r_idx, d, p)] for r_idx in range(len(data.rooms)))
                        model.Add(c_active == grp_active)
                
                model.AddAtMostOne(group_active_vars)

    # D. Room and Teacher Mutual Exclusivity
    for d in range(data.num_days):
        for p in range(data.num_periods):
            for r_idx in range(len(data.rooms)):
                model.AddAtMostOne(schedule[(c.id, r_idx, d, p)] for c in data.courses)
            for teacher in data.teachers:
                teacher_courses = [c.id for c in data.courses if teacher in c.teachers]
                model.AddAtMostOne(schedule[(cid, r_idx, d, p)] for cid in teacher_courses for r_idx in range(len(data.rooms)))

    # E. Maximum 1 Lab Group Per Day
    for section in data.sections:
        sec_courses = [c for c in data.courses if c.section == section]
        lab_groups = {}
        for c in sec_courses:
            if c.is_lab:
                grp_name = c.elective_group if c.elective_group else f"core_lab_{c.id}"
                if grp_name not in lab_groups: lab_groups[grp_name] = []
                lab_groups[grp_name].append(c.id)

        for d in range(data.num_days):
            daily_active_lab_groups = []
            for grp_name, c_ids in lab_groups.items():
                grp_active_today = model.NewBoolVar(f"lab_grp_{grp_name}_active_d{d}")
                total_classes_today = sum(
                    schedule[(cid, r_idx, d, p)] 
                    for cid in c_ids for r_idx in range(len(data.rooms)) for p in range(data.num_periods)
                )
                model.Add(total_classes_today > 0).OnlyEnforceIf(grp_active_today)
                model.Add(total_classes_today == 0).OnlyEnforceIf(grp_active_today.Not())
                daily_active_lab_groups.append(grp_active_today)
            
            model.Add(sum(daily_active_lab_groups) <= 1)

    # F. Even Distribution (Dynamic Load Balancing)
    for section in data.sections:
        sec_courses = [c for c in data.courses if c.section == section]
        unique_groups_hours = {}
        for c in sec_courses:
            grp = c.elective_group if c.elective_group else f"core_{c.id}"
            if grp not in unique_groups_hours: unique_groups_hours[grp] = c.hours
        
        total_student_hours = sum(unique_groups_hours.values())
        avg_hours = total_student_hours // data.num_days
        min_classes = max(1, avg_hours - 1)
        max_classes = min(data.num_periods - 1, avg_hours + 2)

        for d in range(data.num_days):
            active_periods_today = []
            for p in range(data.num_periods):
                period_active = model.NewBoolVar(f"sec_{section}_d{d}_p{p}_active_load")
                total_classes_this_period = sum(
                    schedule[(c.id, r_idx, d, p)] 
                    for c in sec_courses for r_idx in range(len(data.rooms))
                )
                model.Add(total_classes_this_period > 0).OnlyEnforceIf(period_active)
                model.Add(total_classes_this_period == 0).OnlyEnforceIf(period_active.Not())
                active_periods_today.append(period_active)
            
            model.Add(sum(active_periods_today) <= max_classes)
            model.Add(sum(active_periods_today) >= min_classes)

    # G. Faculty Workload Balancing (PPT Requirement)
    max_teacher_hours_per_day = 4
    for teacher in data.teachers:
        teacher_courses = [c.id for c in data.courses if teacher in c.teachers]
        if not teacher_courses: continue
            
        for d in range(data.num_days):
            daily_teacher_classes = []
            for p in range(data.num_periods):
                for r_idx in range(len(data.rooms)):
                    for cid in teacher_courses:
                        daily_teacher_classes.append(schedule[(cid, r_idx, d, p)])
            
            model.Add(sum(daily_teacher_classes) <= max_teacher_hours_per_day)

    # --- SOLVE ---
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 45.0 
    status = solver.Solve(model)

    # --- FORMAT OUTPUT ---
    if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
        result = {section: [] for section in data.sections}
        for section in data.sections:
            for d in range(data.num_days):
                for p in range(data.num_periods):
                    if solver.Value(recess[(section, d, p)]) == 1:
                        result[section].append(ScheduledClass(
                            day=d, period=p + 1, room="Campus", course_name="RECESS", teachers=[], is_recess=True
                        ))
                    else:
                        for r_idx, room in enumerate(data.rooms):
                            for c in data.courses:
                                if c.section == section and solver.Value(schedule[(c.id, r_idx, d, p)]) == 1:
                                    result[section].append(ScheduledClass(
                                        day=d, period=p + 1, room=room, course_name=c.name, teachers=c.teachers
                                    ))
        return {"status": "success", "schedule": result, "message": "Timetable generated successfully"}
    else:
        return {"status": "failed", "schedule": None, "message": "Could not find a conflict-free timetable."}


# ==========================================
# 4. FASTAPI ENDPOINTS
# ==========================================

@app.post("/api/v1/generate", response_model=TimetableResponse)
async def create_timetable(request: TimetableRequest):
    try:
        result = generate_schedule(request)
        if result["status"] == "failed":
            raise HTTPException(status_code=400, detail=result["message"])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/reschedule-dynamic", response_model=TimetableResponse)
async def dynamic_reschedule(request: RescheduleRequest):
    """Greedy search for dynamic updates without re-running OR-Tools."""
    schedule = request.current_schedule
    section = request.course.section
    teachers = request.course.teachers
    
    for p in range(1, request.num_periods + 1):
        # 1. Is section busy?
        if any(c.day == request.target_day and c.period == p for c in schedule.get(section, [])):
            continue
            
        # 2. Are teachers busy?
        teacher_busy = False
        for sec, classes in schedule.items():
            for c in classes:
                if c.day == request.target_day and c.period == p and any(t in c.teachers for t in teachers):
                    teacher_busy = True
                    break
            if teacher_busy: break
        if teacher_busy: continue
            
        # 3. Find room
        occupied = [c.room for sec, classes in schedule.items() for c in classes if c.day == request.target_day and c.period == p and not c.is_recess]
        available = [r for r in request.all_rooms if r not in occupied]
        
        if available:
            new_class = ScheduledClass(
                day=request.target_day, period=p, room=available[0],
                course_name=request.course.name + " (Rescheduled)", teachers=teachers
            )
            if section not in schedule: schedule[section] = []
            schedule[section].append(new_class)
            schedule[section] = sorted(schedule[section], key=lambda x: (x.day, x.period))
            return {"status": "success", "schedule": schedule, "message": f"Rescheduled to Period {p} in {available[0]}."}
            
    raise HTTPException(status_code=400, detail="No available slots found for dynamic regeneration on this day.")

@app.post("/api/v1/export/excel")
async def export_schedule_to_excel(request: ExportRequest):
    try:
        output = io.BytesIO()
        day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        days_to_use = day_names[:request.num_days]
        period_names = [f"Period {i}" for i in range(1, request.num_periods + 1)]

        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            for section, classes in request.schedule.items():
                df = pd.DataFrame(index=days_to_use, columns=period_names)
                df.fillna("---", inplace=True) 
                
                for c in classes:
                    day_row = day_names[c.day]
                    period_col = f"Period {c.period}"
                    if c.is_recess:
                        df.at[day_row, period_col] = "RECESS"
                    else:
                        teachers_str = ", ".join(c.teachers)
                        df.at[day_row, period_col] = f"{c.course_name}\n({teachers_str})\n[{c.room}]"
                df.to_excel(writer, sheet_name=section)

        output.seek(0)
        headers = {'Content-Disposition': 'attachment; filename="AcadFlow_Timetable.xlsx"'}
        return StreamingResponse(output, headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate Excel: {str(e)}")