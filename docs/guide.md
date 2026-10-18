# Consumer guide

Install an exact published `pith-ui` version and commit its lockfile. Import
parts from `pith-ui`, regions and their state/callback types from
`pith-ui/recipes`, and one stylesheet from `pith-ui/styles.css`.

Use `compose*` to create regions and attach their opaque parts to one parent
before calling `mountParts`. Use `createDialogHost` on a composed frame for
host-defined dialog slots. The [assembly guide](../APP.md) shows a complete
minimal connection; [API.md](../API.md) indexes all legal public exports.

Keep application coordination thin: project business state into region state,
forward callbacks to existing controllers, and check the original operation
object before writes. UI disposal ignores late presentation results; request
cancellation and write validity remain controller responsibilities.

Use the showroom for part and region acceptance. Never duplicate region source,
import sibling checkout code, inspect private nodes, or override library CSS.
