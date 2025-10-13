# Feature Proposals

This directory contains proposals for on-chain feature contracts. Each proposal outlines the problem a feature solves, defines its interface, and documents integrations and dependencies.

## Purpose

Feature proposals enable a lightweight, structured process for:
- **Problem Definition**: Clearly articulate the need a feature addresses
- **Interface Design**: Define standard, human and AI-friendly interfaces
- **Integration Planning**: Document dependencies and inter-contract relationships
- **Decision Making**: Enable review and discussion before implementation
- **Documentation**: Maintain a record of design decisions and rationale

## Proposal Process

### 1. Create a Proposal

Use the [TEMPLATE.md](./TEMPLATE.md) to create a new proposal:

```bash
cp proposals/TEMPLATE.md proposals/XXX-feature-name.md
```

- Number proposals sequentially (001, 002, etc.)
- Use kebab-case for feature names
- Fill in all sections of the template

### 2. Define the Problem

Clearly articulate:
- What problem does this feature solve?
- Who are the users?
- What are the use cases?
- What alternatives exist?

### 3. Design the Interface

Define a clean, minimal interface:
- Events for all state changes
- Clear function signatures
- Error conditions
- Access control patterns

### 4. Document Dependencies

Identify:
- Required base contracts
- Optional integrations
- External contract dependencies
- Off-chain dependencies

### 5. Review and Iterate

- Share the proposal for feedback
- Iterate on the design
- Consider security implications
- Validate gas efficiency

### 6. Implementation

Once approved:
- Implement the contract following the interface
- Write comprehensive tests
- Create factory contract
- Build demo UI
- Deploy and verify

## Proposal Structure

Each proposal should include:

1. **Metadata**: Title, status, author, created date
2. **Summary**: Brief overview of the feature
3. **Problem Statement**: Detailed problem description
4. **Proposed Solution**: How the feature solves the problem
5. **Interface Specification**: Detailed contract interface
6. **Integration**: Dependencies and integrations
7. **Security Considerations**: Risks and mitigations
8. **Implementation Notes**: Technical details
9. **Success Criteria**: How to measure success

## Status Values

- `draft` - Initial proposal, open for feedback
- `review` - Under active review
- `accepted` - Approved for implementation
- `implemented` - Feature is live
- `rejected` - Not moving forward
- `superseded` - Replaced by another proposal

## Examples

- [001-game-match.md](./001-game-match.md) - Escrow-based match system

## AI-Friendly Design

Proposals are structured to be easily parsable by AI systems:
- Consistent markdown structure
- Clear section headings
- Explicit interface definitions
- Machine-readable metadata
- Structured decision rationale

This enables AI assistants to:
- Understand feature requirements
- Generate implementation code
- Suggest improvements
- Identify integration points
- Validate consistency

## Benefits

### For Developers
- Clear requirements before coding
- Reduced implementation churn
- Better architectural decisions
- Easier onboarding

### For Reviewers
- Structured review process
- Clear evaluation criteria
- Documented trade-offs
- Easy comparison of alternatives

### For AI Assistants
- Parsable structure
- Clear context for code generation
- Consistent patterns
- Explicit constraints

## Guidelines

### Do
- ✅ Start with the problem, not the solution
- ✅ Keep interfaces minimal and focused
- ✅ Document all assumptions
- ✅ Consider gas costs early
- ✅ Think about composability
- ✅ Plan for upgrades and evolution

### Don't
- ❌ Skip the proposal for "simple" features
- ❌ Include implementation details in interface spec
- ❌ Assume familiarity with context
- ❌ Ignore security implications
- ❌ Over-engineer the solution

## Resources

- [TEMPLATE.md](./TEMPLATE.md) - Proposal template
- [../DEVELOPMENT.md](../DEVELOPMENT.md) - Development guide
- [../README.md](../README.md) - Project overview
