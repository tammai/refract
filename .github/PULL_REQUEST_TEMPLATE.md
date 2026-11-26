## Summary

<!-- Briefly describe what changed and why. -->

## Type of Change

- [ ] Bug fix
- [ ] New feature / extraction heuristic
- [ ] Documentation / guide update
- [ ] CI / plugin packaging update

## Verification Checklist

- [ ] `node --check` passes for all scripts in `skills/extract-referent/scripts/`
- [ ] `claude plugin validate --strict .` passes with 0 errors/warnings
- [ ] `agy plugin validate --strict .` passes with 0 errors/warnings
- [ ] Executable permissions (`0755`) preserved on scripts
- [ ] `CHANGELOG.md` updated if user-facing behavior changed
