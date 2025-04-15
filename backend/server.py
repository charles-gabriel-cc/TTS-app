from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import whisper
import uvicorn

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Whisper model
model = whisper.load_model("base")

@app.post("/transcribe/")
async def transcribe_audio(audio: UploadFile = File(...)):
    # We'll implement this later
    return {"message": "Audio received"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
