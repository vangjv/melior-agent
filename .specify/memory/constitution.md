<!--
Sync Impact Report:
- Version change: Initial → 1.0.0
- New Constitution: First establishment of MeliorAgent principles
- Added sections: Angular Architecture, Code Quality Standards, Testing Requirements
- Templates requiring updates: All templates need alignment with Angular-specific principles
- Follow-up TODOs: None - all placeholders filled
-->

# MeliorAgent Constitution

## Core Principles

### I. Angular-First Architecture
Every component must follow Angular best practices using standalone components by default. Components must use Angular 19+ features including `input()`, `output()`, `viewChild()`, `viewChildren()`, `contentChild()` and `contentChildren()` functions instead of decorators. All code must leverage Angular Signals for reactive state management with `signal()`, `computed()`, and `effect()`. 

**Rationale**: Ensures consistency with modern Angular patterns and provides optimal performance through signal-based reactivity.

### II. Type Safety (NON-NEGOTIABLE)
TypeScript strict mode must be enabled. Every component, service, and interface must have explicit typing. All API responses must be typed with proper interfaces. Form handling must use typed reactive forms with `FormGroup` and `FormControl`.

**Rationale**: Type safety prevents runtime errors and improves code maintainability in large applications.

### III. Test-First Development
TDD mandatory for all features: Tests written → User approved → Tests fail → Implementation follows. Unit tests required for components and services using Jasmine/Karma. Integration tests required for HTTP services using `provideHttpClientTesting`. Signal-based state updates must be tested with Angular testing utilities.

**Rationale**: Ensures reliability and enables confident refactoring in Angular applications.

### IV. Performance & Scalability
Components must use `OnPush` change detection strategy where appropriate. Lazy loading required for all feature routes. Bundle optimization through proper tree-shaking and dead code elimination. `trackBy` functions mandatory in `ngFor` loops. HTTP responses must implement caching strategies using RxJS `shareReplay`.

**Rationale**: Maintains responsive user experience as the application grows.

### V. Accessibility & Standards
All UI components must follow WCAG 2.1 AA standards with proper ARIA attributes. Semantic HTML required throughout. Angular Material components preferred for consistent theming. Responsive design mandatory using CSS Grid/Flexbox or Angular CDK Layout utilities.

**Rationale**: Ensures inclusive design and professional user experience across devices.

## Code Quality Standards

All code must pass Angular CLI linting with no errors. SCSS styling with component-level encapsulation required. Security best practices enforced including input sanitization and route guards for authentication. Global error handling implemented through HTTP interceptors.

**File Organization**: Follow Angular Style Guide naming conventions (feature.ts for components, feature-service.ts for services). Feature-based folder structure with clear separation of smart vs presentational components.

## Testing Requirements

Minimum 80% code coverage for services and components. E2E tests required for critical user journeys. All async operations must be properly tested with TestBed and mocked dependencies. API integration tests must validate both success and error scenarios.

**Test Strategy**: Focus on user behavior rather than implementation details. Test signal state changes and component interactions thoroughly.

## Governance

This Constitution supersedes all other development practices. All pull requests must demonstrate compliance with these principles before merge approval. Code reviews must verify TypeScript typing, test coverage, accessibility standards, and performance considerations.

**Amendment Process**: Constitution changes require team consensus and version increment following semantic versioning. All templates and documentation must be updated to reflect constitutional changes.

**Compliance Review**: Weekly architecture reviews to ensure ongoing adherence to Angular best practices and constitutional principles.

**Version**: 1.0.0 | **Ratified**: 2025-10-24 | **Last Amended**: 2025-10-24
