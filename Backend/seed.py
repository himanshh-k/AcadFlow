from sqlalchemy.orm import Session
from Backend.database import engine, SessionLocal
from Backend.models import Base, User
from Backend.auth import get_password_hash

# Create tables
Base.metadata.create_all(bind=engine)

def seed():
    db = SessionLocal()
    try:
        # Check if admin exists
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            admin_user = User(
                username="admin",
                password_hash=get_password_hash("admin123"),
                role="admin",
                teacher_initials=None
            )
            db.add(admin_user)
        
        # Check if a test faculty exists
        faculty = db.query(User).filter(User.username == "faculty").first()
        if not faculty:
            # Let's link it to initials 'NG' based on screenshot
            faculty_user = User(
                username="faculty",
                password_hash=get_password_hash("faculty123"),
                role="faculty",
                teacher_initials="NG"
            )
            db.add(faculty_user)
        
        db.commit()
        print("Database seeded successfully with 'admin' and 'faculty' users.")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
