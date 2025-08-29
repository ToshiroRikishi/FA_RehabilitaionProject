# /home/user/HpProject/backend/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import (
    doctor,
    level_fa,
    upload_patients,
    patient_card,
    patient_program  
)

app = FastAPI()

# Настройка CORS для взаимодействия с фронтендом
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение маршрутов
app.include_router(doctor.router)
app.include_router(upload_patients.router, prefix="/api")
app.include_router(level_fa.router, prefix="/level-fa", tags=["level-fa"])
app.include_router(patient_card.router)
app.include_router(patient_program.router)

@app.get("/")
async def root():
    return {"message": "Welcome to the Geriatric Assessment API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)