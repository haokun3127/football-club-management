# Backoffice State

The server owns sessions and business facts. Only HttpOnly cookies carry authentication; no token/password storage. Restore the session before enabling login. A 401 clears the workspace through the shared unauthorized event.

Feature editors keep expected revisions and unsaved inputs in memory. Invalidate pending reads on close, route/unmount and opening another object; stale responses must not overwrite another editor. Disable duplicate submits. Retain one UUID per unchanged mutation body for retries with unknown outcomes; changes to payload require a new UUID.

A 409 preserves inputs and displays an explicit reload/review action. Never fetch a fresh revision and silently resubmit old inputs. Success requires a server response, followed by table/detail readback. Clear private identity inputs after successful submission or leaving their editor. Failed logout remains an error until the server confirms logout.
