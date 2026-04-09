# AcadFlow: Intelligent Academic Scheduling API

A lightweight, constraint-based timetable generation engine built with FastAPI and Google OR-Tools. 

## Quick Start

**1. Clone the repository**
```
git clone https://github.com/himanshh-k/AcadFlow.git
cd AcadFlow
```

**2. Create a Virtual Environment**
```
python -m venv venv
venv\Scripts\activate
```

**3. Install dependencies**
```
pip install -r requirements.txt
```

**4. Navigate to Backend folder and start the server**
```
cd Backend
uvicorn main:app --reload
```

**5. Test the API**<br>
Once the server is running, open your browser and navigate to:
[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) 

**6. Test custom json file**<br>
Expand /api/v1/generate<br>
Click "Try it out" and paste json content to generate a timetable
