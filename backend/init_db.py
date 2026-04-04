import sys
import os

# Ensure the app directory is in the path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.database import engine, Base, SessionLocal
from app.models.user import User
# Explicitly import all models to ensure they are registered with Base.metadata
import app.models.user
import app.models.paper
import app.models.chunk
import app.models.extraction
import app.models.matrix
import app.models.audit_log
import app.models.zotero_mapping

def init_db():
    print("Creating tables...")
    #Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("Tables created.")

    db = SessionLocal()
    try:
        default_user_id = '00000000-0000-0000-0000-000000000001'
        existing = db.query(User).filter(User.id == default_user_id).first()
        if not existing:
            user = User(
                id=default_user_id, 
                email='default@slr.local', 
                name='Default User'
            )
            db.add(user)
            db.commit()
            print("Default user created.")
        else:
            print("Default user already exists.")
    except Exception as e:
        print(f"Error seeding user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
