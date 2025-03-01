# Storage Planner
<div align="center">
  <img src="https://raw.githubusercontent.com/buildthehomelab/storage-planner/main/public/storage-planner-logo.png" alt="Storage Planner Logo" width="200">
  <br>
</div>

## 📋 Overview

Storage Planner is a modern, interactive web application that helps you plan and visualize your storage infrastructure. Whether you're building a home NAS, planning enterprise storage, or just exploring different RAID configurations, this tool helps you make informed decisions.

<div align="center">
  <img src="https://github.com/buildthehomelab/storage-planner/blob/main/public/storage-planner.gif"  width="400">
</div>


## 🏗️ Platform Support

Storage Planner Docker images are built for multiple architectures:

- `linux/amd64` - Standard x86_64 systems
- `linux/arm64` - 64-bit ARM (ARMv8) systems like Raspberry Pi 4, AWS Graviton, and Apple Silicon
- `linux/arm/v7` - 32-bit ARM systems like Raspberry Pi 3 and earlier

This means you can run Storage Planner on various hardware without additional configuration. Docker will automatically pull the correct image for your architecture.

## 🚀 Quick Start

### Using Docker

```bash
docker pull ghcr.io/buildthehomelab/storage-planner:latest
docker run -p 3000:3000 ghcr.io/buildthehomelab/storage-planner:latest
```
Visit `http://localhost:3000` in your browser.

## ✨ Features

- **Multiple File System Support**:
  - ZFS with custom vdev configuration
  - Unraid with parity drives
  - Synology SHR and BTRFS
  - SnapRAID
  - Standard RAID configurations

- **Interactive Drive Visualization**:
  - Drag-and-drop drive management
  - Support for drives from 1TB to 30TB
  - Create and manage ZFS vdevs visually

- **Detailed Performance Metrics**:
  - Estimated read/write speeds
  - Storage efficiency calculations
  - Reliability scoring
  - Raw vs. formatted capacity

- **Educational Resources**:
  - Detailed explanations of RAID types
  - ZFS vdev configuration guides
  - SnapRAID functionality overview

## 🛠️ Technologies Used

- **Framework**: Next.js 14
- **UI Framework**: React 18
- **Styling**: Tailwind CSS
- **Containerization**: Docker

## 📊 Use Cases

- **Home NAS Planning**: Visualize your home NAS storage configuration before buying hardware
- **Enterprise Storage Design**: Plan complex ZFS pool arrangements for optimal performance and redundancy
- **Upgrade Planning**: Calculate the benefits of expanding existing arrays with new drives
- **Educational Tool**: Learn about different RAID levels and their pros/cons

## 🤝 Contributing

Contributions are welcome! If you'd like to contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code follows the existing style and includes appropriate tests.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- [ZFS Documentation](https://openzfs.github.io/openzfs-docs/)
- [Synology Knowledge Base](https://www.synology.com/en-global/knowledgebase)
- [SnapRAID Documentation](https://www.snapraid.it/manual)
- [Unraid Documentation](https://wiki.unraid.net/)

---

<div align="center">
  Made with ❤️ for storage enthusiasts and homelab builders everywhere
  <br>
  © 2025 Storage Planner
</div>
