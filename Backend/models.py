from sqlalchemy import Column, Integer, String, Text
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String)  # 'admin' or 'faculty'
    teacher_initials = Column(String, nullable=True)  # Comma separated if multiple, e.g. 'JD, JS'

class TimetableState(Base):
    __tablename__ = "timetable_state"
    
    id = Column(Integer, primary_key=True, index=True)
    schedule_json = Column(Text)  # Store the JSON string of the schedule
    payload_json = Column(Text)   # Store the entire payload to render timetable easily
