# Migration Notes for Team

## Overview

This document guides team members through the transition from the monolithic HTML template to the new modular EJS-based system. It covers what has changed for developers, new best practices, and how to maintain the modular structure.

## What Changed for Developers

### Before: Monolithic Development
```bash
# Old workflow
1. Edit single large file: public/index.html (305KB)
2. Find relevant sections in 3000+ lines
3. Risk conflicts with other developers
4. Difficult to track changes in version control
5. No build step - direct HTML file usage
```

### After: Modular Development
```bash
# New workflow
1. Identify component: styles/, scripts/, patterns/, etc.
2. Edit focused partial file (typically <100 lines)
3. Run build process: npm run build
4. Test in development server: npm run serve
5. Commit focused changes
```

### Key Workflow Changes

#### **File Editing**
- **Old**: Search through `public/index.html` for relevant sections
- **New**: Navigate to appropriate partial in `src/template/partials/`

#### **Testing Changes**
- **Old**: Open `public/index.html` directly in browser
- **New**: Use `npm run serve` for development, `npm run build` for production testing

#### **Version Control**
- **Old**: All changes appear in single large file diff
- **New**: Changes isolated to specific partial files with clear purpose

#### **Collaboration**
- **Old**: Frequent merge conflicts in single file
- **New**: Parallel development on different partials with minimal conflicts

## Team Onboarding Guide

### 1. **Environment Setup**

#### **Prerequisites Check**
```bash
node --version  # Should be 18+
npm --version   # Should be 8+
```

#### **Project Setup**
```bash
# Clone and install dependencies
git clone [repository]
cd katachi-generator
npm install

# Verify build system
npm run build
ls -la dist/template.html  # Should exist and be ~300KB
```

#### **Development Server Test**
```bash
npm run serve
# Browser should open to http://localhost:9000
# Template should load with origami patterns
```

### 2. **Understanding the Architecture**

#### **Mental Model Transition**
```
Old Mental Model:
public/index.html = Everything in one file

New Mental Model:
src/template/index.ejs = Template orchestrator
├── partials/head.ejs = <head> section
├── partials/body-content.ejs = <body> structure  
├── partials/styles/* = CSS organization
├── partials/scripts/* = JavaScript modules
└── partials/patterns/* = Origami SVG data
```

#### **Key Concepts**
- **Partials**: Small, focused template components
- **EJS**: Template engine that processes includes and variables
- **Build Process**: Combines partials into single HTML file
- **Asset Inlining**: All resources embedded in final HTML

### 3. **Common Development Tasks**

#### **Task: Update UI Styling**

**Old Process**:
1. Open `public/index.html`
2. Search for `<style>` tags
3. Find relevant CSS among thousands of lines
4. Make changes carefully to avoid breaking other styles
5. Save file

**New Process**:
1. Identify style category: Bootstrap, Custom, or Animations
2. Edit appropriate file: `src/template/partials/styles/[category].ejs`
3. Save changes (auto-reload in dev server)
4. Test in browser
5. Build for production: `npm run build`

#### **Task: Add New Origami Pattern**

**Old Process**:
1. Find origami patterns array in large HTML file
2. Add pattern data inline
3. Update pattern selection logic
4. Test entire application

**New Process**:
1. Create new file: `src/template/partials/patterns/new-pattern.ejs`
2. Use standard pattern template structure
3. Add include to `src/template/partials/patterns/index.ejs`
4. Add to patterns array
5. Test build and functionality

#### **Task: Modify JavaScript Logic**

**Old Process**:
1. Search through `<script>` tags in large file
2. Identify correct script section
3. Make changes without breaking dependencies
4. Hard to debug due to mingled code

**New Process**:
1. Identify function area: three-setup, origami, or interactions
2. Edit focused file: `src/template/partials/scripts/[area].ejs`
3. Maintain clear separation of concerns
4. Test individual components

### 4. **New Best Practices**

#### **File Organization Best Practices**

1. **Single Responsibility**: Each partial should have one clear purpose
   ```bash
   # Good
   src/template/partials/styles/custom.ejs    # Only custom CSS
   src/template/partials/patterns/crane.ejs  # Only crane pattern
   
   # Avoid
   src/template/partials/everything.ejs      # Mixed concerns
   ```

2. **Descriptive Naming**: File names should clearly indicate content
   ```bash
   # Good
   three-setup.ejs    # Three.js initialization
   animations.ejs     # CSS animations
   
   # Avoid  
   script1.ejs        # Unclear purpose
   styles.ejs         # Too generic
   ```

3. **Consistent Structure**: Follow established patterns for new files
   ```html
   <!-- Standard pattern file structure -->
   <!-- [Description] -->
   <script>
   const patternNamePattern = {
       maxFolding: 95,
       name: "pattern.svg", 
       patternType: "PatternName",
       svgContent: `...`
   };
   </script>
   ```

#### **Development Workflow Best Practices**

1. **Test Early and Often**
   ```bash
   # Make small changes and test frequently
   # Edit partial → save → check auto-reload → continue
   npm run serve  # Keep development server running
   ```

2. **Build Before Committing**
   ```bash
   # Always verify production build works
   npm run build
   # Check output size and functionality
   ls -lh dist/template.html
   ```

3. **Incremental Development**
   ```bash
   # Work on one partial at a time
   # Commit working changes before moving to next component
   git add src/template/partials/styles/custom.ejs
   git commit -m "Update button styles for mobile responsiveness"
   ```

#### **Code Quality Best Practices**

1. **Comment Your Changes**
   ```html
   <!-- Clear comments for complex sections -->
   <!-- Bootstrap grid customizations for mobile layout -->
   <style>
   .container-fluid {
       /* Custom padding for mobile devices */
       padding: 0 10px;
   }
   </style>
   ```

2. **Maintain EJS Syntax**
   ```html
   <!-- Correct EJS include syntax -->
   <%- include('partials/head') %>
   
   <!-- Variable injection -->
   <title><%= title %></title>
   ```

3. **Preserve Load Order**
   ```html
   <!-- Maintain critical script loading sequence -->
   <%- include('partials/scripts/three-setup') %>     <!-- Libraries first -->
   <%- include('partials/scripts/origami') %>         <!-- Core logic -->
   <%- include('partials/scripts/interactions') %>    <!-- UI handlers -->
   ```

### 5. **Maintaining the Modular Structure**

#### **Avoiding Anti-Patterns**

1. **Don't Create "God Partials"**
   ```bash
   # Wrong: Putting everything in one partial
   src/template/partials/all-scripts.ejs  # 500+ lines
   
   # Right: Focused partials
   src/template/partials/scripts/three-setup.ejs     # 80 lines
   src/template/partials/scripts/origami.ejs         # 120 lines  
   src/template/partials/scripts/interactions.ejs    # 90 lines
   ```

2. **Don't Bypass the Build System**
   ```bash
   # Wrong: Editing dist/template.html directly
   # Changes will be lost on next build
   
   # Right: Edit source partials and rebuild
   # Changes are persistent and tracked
   ```

3. **Don't Duplicate Code**
   ```html
   <!-- Wrong: Repeated code in multiple partials -->
   
   <!-- Right: Shared code in appropriate partial -->
   <!-- Common utilities in scripts/three-setup.ejs -->
   <!-- Reusable styles in styles/custom.ejs -->
   ```

#### **Refactoring Guidelines**

1. **When to Create New Partials**
   - File exceeds ~100 lines
   - Multiple distinct responsibilities
   - Code that could be reused
   - Logically separate functionality

2. **When to Merge Partials**
   - Very small files (<20 lines) with related functionality
   - Partials that are always used together
   - Over-fragmentation hurting readability

3. **Refactoring Process**
   ```bash
   # 1. Identify refactoring opportunity
   # 2. Create new partial structure
   # 3. Move code gradually
   # 4. Test after each move
   # 5. Update includes in index.ejs
   # 6. Verify build and functionality
   ```

### 6. **Debugging in the New System**

#### **Development Debugging**
```bash
# Check EJS compilation
npm run build 2>&1 | grep -i error

# Verify partial includes
grep -r "include.*partials" src/template/

# Test individual partials
node -e "const ejs = require('ejs'); ejs.renderFile('src/template/partials/head.ejs', console.log)"
```

#### **Browser Debugging**
```javascript
// Check global variables
console.log('Patterns loaded:', window.origamiPatterns?.length);
console.log('Three.js version:', window.THREE?.REVISION);
console.log('Edit mode:', window.editMode);

// Verify template compilation
console.log('NFT data type:', typeof nftData);
console.log('Contains placeholder:', 
  document.documentElement.innerHTML.includes('___NFT_DATA_PLACEHOLDER___'));
```

#### **Build Output Analysis**
```bash
# Check final template size and content
wc -l dist/template.html
grep -c "<script>" dist/template.html
grep -c "origamiPatterns" dist/template.html

# Verify all patterns included
for pattern in airplane crane flower hypar pinwheel; do
  grep -c "${pattern}Pattern" dist/template.html
done
```

### 7. **Performance Considerations**

#### **Development Performance**
- **Build Speed**: EJS compilation adds ~2-3 seconds to build time
- **File Watching**: Development server watches all partials for changes
- **Memory Usage**: Larger node_modules due to EJS dependencies

#### **Runtime Performance** 
- **Final Output**: Same performance as original monolithic template
- **Load Time**: Single file = no additional HTTP requests
- **Execution**: Identical JavaScript execution to original

### 8. **Team Communication**

#### **Code Reviews**
- **Focused Reviews**: Changes are easier to review in focused partials
- **Context**: Reviewers can understand component purpose quickly
- **Testing**: Reviewers can test specific functionality areas

#### **Documentation Updates**
- **Component Docs**: Document any new partials created
- **Dependency Updates**: Note any new inter-component dependencies
- **Build Changes**: Document webpack or build process modifications

#### **Knowledge Sharing**
- **Pattern Library**: Share reusable patterns with team
- **Best Practices**: Update team best practices based on experience
- **Troubleshooting**: Share common issues and solutions

### 9. **Transition Timeline**

#### **Phase 1: Learning (Week 1)**
- Set up development environment
- Complete small tasks (style updates, pattern additions)
- Get comfortable with build process

#### **Phase 2: Proficiency (Week 2-3)**
- Handle larger refactoring tasks
- Create new partials as needed
- Optimize workflow for personal productivity

#### **Phase 3: Mastery (Month 2+)**
- Mentor new team members
- Contribute to architecture improvements
- Optimize build and development processes

### 10. **Success Metrics**

#### **Individual Developer Success**
- Can complete tasks 2x faster than monolithic system
- Comfortable creating new partials
- No longer need to search through large files
- Clean, focused git commits

#### **Team Success**
- Reduced merge conflicts
- Parallel development on different components
- Faster code reviews
- Better separation of concerns

#### **Project Success**
- Maintained single-file output for NFT generation
- Improved development velocity
- Better code maintainability
- Easier onboarding for new developers

## Conclusion

The transition to modular templates represents a significant improvement in development workflow while maintaining the same final output. Success depends on embracing the new mental model of focused, single-responsibility partials and following the established best practices for modular development.

The initial learning curve is offset by long-term productivity gains, better collaboration, and improved code maintainability. Teams should expect to see improved development velocity within 2-3 weeks of adoption.