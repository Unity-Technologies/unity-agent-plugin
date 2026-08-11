# Common Scene Creation Issues

## Exceeding 3 Capture-and-Fix Rounds

- ALWAYS limit capture and fixing rounds to 3 (three). This improves user experience.
- ALWAYS respect the limit even if you still see issues. 
- WHY? Over iterating wastes user's time. They don't know how the scene will look like.

## Regenerating C# Script Unnecessarily

- If you notice issues in the scene, address them by MODIFYING the C# script you used to build the scene.
- Recreating code and scene from scratch is wasteful.

## Wrong Capture Tool

- 3D scenes: capture several angles, not one. 
- 2D scenes: one straight-on capture is enough.

## Wrong Object Placement Accepted

- When scene has many GameObjects, it is easy to ignore wrong placement in the visual validation step.
- BAD: sofa SINKING through the floor. Houses OVERLAP each other. Player FLOATING above ground.
- GOOD: check the position of each placed GameObject from the image, one by one.
