# Retired native automation

Future game work is in `jbbejena/open-h-hour` / `main`. The user requested CI off
except the relevant web build when making this switch. Windows and Linux YAML
is retained here, outside GitHub's active `.github/workflows/` directory, so it
cannot trigger on pushes, PRs or manual dispatch from this branch. This becomes
the default-branch policy after the retirement PR is merged; it does not cancel
existing runs. No branch protections or required checks are modified.

The old repository's web build remains available by manual dispatch only.
Open H Hour owns the automatic, cached, relevant-path web build going forward.
These files are historical definitions; restoring them requires an intentional
review of their old dependencies, external notifications and publication steps.
