# FP-XXX: [Feature Name]

## Metadata

- **Proposal ID**: FP-XXX
- **Title**: [Feature Name]
- **Status**: draft | review | accepted | implemented | rejected | superseded
- **Author**: [Your Name/Handle]
- **Created**: YYYY-MM-DD
- **Updated**: YYYY-MM-DD
- **Category**: gaming | defi | governance | social | utility | other

## Summary

[Brief 2-3 sentence overview of what this feature does and why it matters]

## Problem Statement

### Background

[Describe the context and background of the problem]

### User Need

[Who needs this feature and why?]

### Current Limitations

[What existing solutions exist and why are they insufficient?]

### Use Cases

1. **[Use Case 1]**: [Description]
2. **[Use Case 2]**: [Description]
3. **[Use Case 3]**: [Description]

## Proposed Solution

### Overview

[High-level description of how this feature solves the problem]

### Key Features

- **[Feature 1]**: [Description]
- **[Feature 2]**: [Description]
- **[Feature 3]**: [Description]

### Design Principles

- [Principle 1]
- [Principle 2]
- [Principle 3]

### User Flow

```
[Diagram or step-by-step flow of how users interact with the feature]
1. User does X
2. Contract does Y
3. Event Z is emitted
```

## Interface Specification

### Contract Interface

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title IYourFeature
 * @notice [Brief description]
 */
interface IYourFeature {
    // ============ Structs ============
    
    struct YourStruct {
        // Define data structures
    }
    
    // ============ Events ============
    
    /// @notice Emitted when [event description]
    event SomethingHappened(
        uint256 indexed id,
        address indexed user,
        uint256 value
    );
    
    // ============ Errors ============
    
    /// @dev Thrown when [error condition]
    error InvalidParameter();
    
    // ============ Functions ============
    
    /**
     * @notice [Function description]
     * @param param1 [Description of param1]
     * @return returnValue [Description of return value]
     */
    function yourFunction(uint256 param1) external returns (uint256 returnValue);
}
```

### State Management

[Describe the contract's state variables and storage patterns]

```solidity
// Example state variables
mapping(uint256 => YourStruct) private _items;
uint256 private _counter;
```

### Access Control

[Define who can call which functions]

- **Public Functions**: [List and describe]
- **Owner-Only Functions**: [List and describe]
- **Controller-Only Functions**: [List and describe]

## Integration

### Dependencies

#### Required Base Contracts

- `IFeature` - Base feature interface
- `FeatureController` - Access control and lifecycle management
- `Owned` - Ownership functionality

#### Optional Integrations

- `[ContractName]` - [Why and how it integrates]

### Inter-Contract Communication

[Describe how this feature interacts with other contracts]

```
[Diagram or description of contract interactions]
YourFeature --> OtherFeature: calls someFunction()
YourFeature <-- ScoreBoard: receives results
```

### External Dependencies

- **Tokens**: [ERC20, native tokens, etc.]
- **Oracles**: [Price feeds, randomness, etc.]
- **Other**: [Any external services]

## Implementation Details

### Gas Optimization

- [Strategy 1]: [Description]
- [Strategy 2]: [Description]

### Storage Cleanup

[Describe when and how storage is cleaned up to save gas]

### Upgrade Strategy

[How will this contract be upgraded if needed?]

- Immutable (no upgrades)
- Proxy pattern
- Migration pattern
- Other

## Security Considerations

### Threat Model

[What are the potential attack vectors?]

1. **[Threat 1]**: [Description and likelihood]
2. **[Threat 2]**: [Description and likelihood]

### Mitigations

1. **[Mitigation 1]**: [How it addresses threats]
2. **[Mitigation 2]**: [How it addresses threats]

### Access Control Risks

[Who has special privileges and what are the risks?]

### Economic Risks

[MEV, front-running, economic attacks, etc.]

### Known Limitations

[What are the acknowledged trade-offs or limitations?]

## Testing Strategy

### Unit Tests

- [ ] Test all public functions
- [ ] Test access control
- [ ] Test error conditions
- [ ] Test edge cases

### Integration Tests

- [ ] Test contract interactions
- [ ] Test token transfers
- [ ] Test event emissions

### Fuzz Testing

[Describe fuzz testing approach]

### Test Coverage Target

- Target: 100% line coverage
- Critical paths must have multiple test cases

## Deployment Plan

### Factory Contract

[Will this use a factory? Describe the factory interface]

### Initial Configuration

[What parameters need to be set on deployment?]

```solidity
// Example deployment
YourFeature feature = new YourFeature(
    owner,
    controller,
    initialParam
);
```

### Migration Path

[If replacing an existing feature, how will migration work?]

## Success Criteria

### Functional Requirements

- [ ] [Requirement 1]
- [ ] [Requirement 2]
- [ ] [Requirement 3]

### Performance Requirements

- [ ] Gas cost for [operation] < [X] gas
- [ ] Supports [Y] concurrent users
- [ ] Handles [Z] transactions per block

### Quality Requirements

- [ ] 100% test coverage
- [ ] Security audit completed
- [ ] Documentation complete

## Timeline

- **Proposal**: YYYY-MM-DD
- **Review Period**: [X weeks]
- **Implementation**: [Y weeks]
- **Testing**: [Z weeks]
- **Deployment**: Target date

## Alternatives Considered

### Alternative 1: [Name]

**Pros**: [List pros]
**Cons**: [List cons]
**Rejected because**: [Reason]

### Alternative 2: [Name]

**Pros**: [List pros]
**Cons**: [List cons]
**Rejected because**: [Reason]

## Open Questions

1. **[Question 1]**: [Description and possible answers]
2. **[Question 2]**: [Description and possible answers]

## References

- [Related proposal or documentation]
- [Similar implementations]
- [Technical resources]

## Changelog

- YYYY-MM-DD: Initial proposal
- YYYY-MM-DD: [Changes made based on feedback]
