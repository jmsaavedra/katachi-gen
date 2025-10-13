- i'll do all testing, you do not do builds or run dev servers. only i do that.

# IMPORTANT: Monorepo Structure
This is a MONOREPO - katachi-generator is a subdirectory within katachi-gen.
- Always use root .gitignore for ignore patterns (e.g., katachi-generator/temp/)
- Be aware of parent directory context when making changes
- Check paths carefully - we're not at the repo root