---
name: unity-scene-creator
description: Skill for creating and visually validating Unity scenes (2D/3D). Use this skill when the user wants to create a new Unity scene or setup a specific environment.
modes: [agent, ask]
---

# Unity Scene Creator

**Important:** When activated, read the reference files:
- `references/common-issues.md` — Common mistakes to avoid

## Instructions

### Step 1: **Gather assets**
  - Use `Find Project assets` tool to create an inventory of relevant assets.
  - Prioritise folders called Prefabs (3D) or Sprites (2D). However, naming might be imperfect.
  - If no relevant assets are found, generate them.

### Step 2: **Create the Scene**
  - Generate the C# script to build the requested 2D or 3D scene. Execute through the Editor with `eval`. Note: you will re-use this code in step 5.

### Step 3: **Capture the Scene**
  - 3D scenes: 
      - Capture several angles of the Scene View — see [references/capturing-the-editor.md](references/capturing-the-editor.md). 
      - FocusObjectIds: If you just placed objects A, B and C, use their IDs. Don't use parent objects (eg. pick building, not city). If unsure, use an empty array.
      - For general view, use an empty array. 
  - 2D scenes: a single straight-on Scene View capture is enough — see [references/capturing-the-editor.md](references/capturing-the-editor.md).
  - This screenshot 1 shows the CURRENT state.

### Step 4: **Validate the Scene**
  - IMPORTANT: Analyse image carefully. Don't rush, as important visual info is easily ignored.
  - Use the following checklist:
    - Are all KEY OBJECTS present in the scene? 
    - Is there any unintentional OVERLAPPING (e.g. trees on top of each other)?
    - Is the SCALE realistic throughout (e.g. table bigger than a pizza)?
    - Is the PLACEMENT correct? Check that objects are not sinking or floating in relation to the surface they should sit on, and that objects are inside their containers (sofa inside a house).
  
### Step 5: **Fix the scene (MAX 3 times)** 
  - If anything does not pass validation, ALWAYS revisit and modify your C# script from step 2. DO NOT start from scratch as it is wasteful.
  - DON'T analyse the screenshot again. It is OUTDATED after your fixes.
  - Instead, when you are done with your fixes, repeat step 3 with new screenshot. 
  - IMPORTANT: NEVER validate and fix more than three (3) times, even if unhappy with results. After 3 rounds, ask for user input. 

### Step 6: **Finish and explain**
  - Describe the outcome to user. 