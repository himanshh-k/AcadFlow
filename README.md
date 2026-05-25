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

**5. Start Frontend**<br>
```
cd ..\Frontend
npm install
npm run dev
```
Click [here](http://localhost:5174) to access the site.
If that didn't work, navigate to the localhost mentioned in the terminal where frontend was started
