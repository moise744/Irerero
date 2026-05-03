# Contributing to Irerero

Thank you for your interest in contributing to **Irerero** — Integrated Digital Platform for Early Childhood Development in Rwanda.

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you are expected to uphold this code.

## How to Contribute

### Reporting Bugs

1. Check existing [Issues](https://github.com/moise744/Irerero/issues) to avoid duplicates.
2. Open a new issue with the **Bug Report** template.
3. Include:
   - Steps to reproduce
   - Expected vs actual behaviour
   - Screenshots / logs
   - OS, browser, Python/Node/Flutter version

### Suggesting Features

1. Open an issue with the **Feature Request** template.
2. Describe the use case and how it aligns with Rwanda's ECD goals.
3. Reference relevant SRS sections if applicable (e.g., `FR-021`, `NFR-009`).

### Pull Requests

1. **Fork** the repository and create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Follow the coding standards below.
3. Write or update tests as needed.
4. Ensure all tests pass locally.
5. Submit a PR against the `main` branch with a clear description.

## Development Setup

See [README.md](README.md) and [RUNNING.md](RUNNING.md) for full setup instructions.

**Quick start:**

```bash
# Backend
cd backend && python -m venv venv && .\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate && python manage.py seed_demo_data

# Web Dashboard
cd web-dashboard && npm install && npm run dev

# Mobile App
cd mobile-app && flutter pub get && flutter run
```

## Coding Standards

### Python (Backend)

- Follow [PEP 8](https://peps.python.org/pep-0008/)
- Use type hints where practical
- Django models: use verbose names and help text
- Docstrings: Google style

### JavaScript/React (Web Dashboard)

- Use functional components with hooks
- Consistent naming: `PascalCase` for components, `camelCase` for functions/variables
- Use Tailwind CSS utility classes

### Dart/Flutter (Mobile App)

- Follow [Effective Dart](https://dart.dev/effective-dart) guidelines
- Use `Provider` for state management
- Keep widgets small and focused

### Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add MUAC measurement screen
fix: correct z-score calculation for edge cases
docs: update deployment instructions
refactor: extract alert engine into separate module
```

## Project Structure

```
Irerero/
├── backend/          # Django REST API
├── web-dashboard/    # React + Vite + Tailwind
├── mobile-app/       # Flutter (Android)
├── documents/        # SRS, architecture docs
├── scripts/          # Dev helper scripts
└── README.md
```

## Questions?

Open a [Discussion](https://github.com/moise744/Irerero/discussions) or reach out via Issues.
