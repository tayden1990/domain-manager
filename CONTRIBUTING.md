# Contributing to Domain Manager Bot

Thank you for your interest in contributing to the Domain Manager Bot project! This is an academic research project developed at Pirogov Russian National Research Medical University (RNRMU).

## 🎓 Academic Context

This project is part of research in medical informatics and automation systems. Contributions are welcome from:
- Fellow researchers and students
- Open source community members
- Healthcare informatics professionals
- Domain management enthusiasts

## 📋 How to Contribute

### 1. Types of Contributions

- **🐛 Bug Reports**: Help us identify and fix issues
- **✨ Feature Requests**: Suggest new functionality
- **📖 Documentation**: Improve guides and documentation
- **🔧 Code Contributions**: Add features or fix bugs
- **🧪 Testing**: Help test new features and edge cases
- **🌐 Translations**: Add support for new languages

### 2. Getting Started

1. **Fork the repository**
   ```bash
   git clone https://github.com/tayden1990/domain-manager.git
   cd domain-manager
   ```

2. **Set up development environment**
   ```bash
   npm install
   cp .env.example .env
   # Edit .env with your test credentials
   npm run dev
   ```

3. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

### 3. Development Guidelines

#### Code Standards
- Use TypeScript for type safety
- Follow existing code structure and patterns
- Add JSDoc comments for functions and classes
- Ensure Docker compatibility

#### Testing
- Test your changes locally before submitting
- Verify Docker build works: `docker build -t test .`
- Test with real Telegram bot if possible

#### Documentation
- Update README.md if adding new features
- Add comments for complex logic
- Update environment variable documentation

### 4. Submission Process

1. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add amazing new feature"
   ```

2. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Create a Pull Request**
   - Use a descriptive title
   - Explain what your changes do
   - Reference any related issues

## 📞 Contact

### Project Maintainer
**Taher Akbari Saeed**  
Postgraduate Student, Pirogov RNRMU

- 📧 Email: [taherakbarisaeed@gmail.com](mailto:taherakbarisaeed@gmail.com)
- 💬 Telegram: [@tayden2023](https://t.me/tayden2023)
- 🔗 ORCID: [0000-0002-9517-9773](https://orcid.org/0000-0002-9517-9773)

### Questions?
- Open an issue for bugs or feature requests
- Contact the maintainer for academic collaboration
- Join discussions in GitHub Discussions (if enabled)

## 🏆 Recognition

Contributors will be acknowledged in:
- README.md contributors section
- Release notes for significant contributions
- Academic publications (with permission)

Thank you for helping make domain management more accessible and automated! 🚀
