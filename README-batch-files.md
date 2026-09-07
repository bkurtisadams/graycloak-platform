# Batch files

Put all four in `C:\graycloak-platform` — the folder that contains
`traveller\`, `graycloak-adnd\`, `gcc\` and `faserip-rules\`. They work out
their own paths from there, so they can be double-clicked from Explorer as
well as run from a prompt.

| File | What it does |
|---|---|
| `test-all.bat` | Every ordinary suite: Traveller, FASERIP, AD&D. No emulator needed; the Traveller rules suite skips. |
| `test-rules.bat` | The security rules. Checks the two rules files match first, then starts the emulator, runs the suite, and shuts it down. |
| `emulator.bat` | Starts the emulator and leaves it running, for repeated test runs or the emulator UI at http://127.0.0.1:4000 |
| `serve-traveller.bat` | Serves the Traveller client at http://localhost:8080/client/index.html |

## The one gotcha

`serve-traveller.bat` holds port 8080, and the Firestore emulator wants the
same port. Run both and whichever starts second fails — that is what happened
when the rules suite hit a Python error page instead of Firestore.

Either stop the Traveller server while testing rules, or change the emulator
port in `graycloak-adnd\firebase.json` and in the `PORT` constant at the top of
`graycloak-adnd\test\traveller-rules.test.mjs`.

## Why test-rules.bat checks the files first

`gcc\firestore.rules` is canonical and `graycloak-adnd\firestore.rules` is the
mirror that deploys. A rules suite passing against one copy proves nothing
about the other, so the batch file refuses to run until they are identical and
tells you the copy command.
