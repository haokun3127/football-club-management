# C11 test-task list design

The page is a BFF-driven task list.  C11 remains responsible only for viewing,
filtering and opening entries that the current task state authorizes.  Figma's
floating add affordance is out of scope because no authenticated create-task
endpoint exists.  The change is local to the safe-area header box model.
