// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Owned} from "./Owned.sol";

/**
 * @title RoleBasedAccess
 * @notice Base contract for role-based access control
 * @dev Provides flexible role management with owner as super-admin
 */
abstract contract RoleBasedAccess is Owned {
    // ============ Constants ============

    /// @notice Role for controller operations (match activation, finalization, etc.)
    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER");

    /// @notice Role for recording match/score results
    bytes32 public constant RECORDER_ROLE = keccak256("RECORDER");

    /// @notice Role for managing competitions (tournaments, leagues)
    bytes32 public constant COMPETITION_MANAGER_ROLE = keccak256("COMPETITION_MANAGER");

    /// @notice Maximum number of members per role
    uint256 public constant MAX_ROLE_MEMBERS = 20;

    // ============ Storage ============

    /// @notice Role membership: role => address => isMember
    mapping(bytes32 => mapping(address => bool)) private _roles;

    /// @notice Role member count: role => count
    mapping(bytes32 => uint256) private _roleMemberCount;

    // ============ Events ============

    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

    // ============ Errors ============

    error MissingRole(bytes32 role, address account);
    error RoleAlreadyGranted();
    error TooManyRoleMembers();
    error CannotRevokeFromSelf();

    // ============ Constructor ============

    constructor(address _owner) Owned(_owner) {}

    // ============ Modifiers ============

    /**
     * @notice Restrict function to addresses with the specified role
     * @param role The required role
     */
    modifier onlyRole(bytes32 role) {
        _checkRole(role);
        _;
    }

    /**
     * @notice Restrict function to controller role
     */
    modifier onlyController() {
        _checkRole(CONTROLLER_ROLE);
        _;
    }

    /**
     * @notice Restrict function to recorder role
     */
    modifier onlyRecorder() {
        _checkRole(RECORDER_ROLE);
        _;
    }

    // ============ Internal Functions ============

    /**
     * @notice Check if caller has the specified role
     * @param role The role to check
     */
    function _checkRole(bytes32 role) internal view {
        if (!hasRole(role, msg.sender)) {
            revert MissingRole(role, msg.sender);
        }
    }

    /**
     * @notice Initialize role-based access for clones
     * @param _owner Owner address
     * @param _controller Initial controller address
     */
    function _initializeRoleBasedAccess(address _owner, address _controller) internal {
        if (_owner == address(0)) revert InvalidOwner();
        owner = _owner;
        emit OwnershipTransferred(address(0), _owner);

        if (_controller != address(0)) {
            _grantRole(CONTROLLER_ROLE, _controller);
        }
    }

    /**
     * @notice Internal function to grant a role
     * @param role The role to grant
     * @param account The account to grant the role to
     */
    function _grantRole(bytes32 role, address account) internal {
        if (_roles[role][account]) revert RoleAlreadyGranted();
        if (_roleMemberCount[role] >= MAX_ROLE_MEMBERS) revert TooManyRoleMembers();

        _roles[role][account] = true;
        _roleMemberCount[role]++;

        emit RoleGranted(role, account, msg.sender);
    }

    /**
     * @notice Internal function to revoke a role
     * @param role The role to revoke
     * @param account The account to revoke the role from
     */
    function _revokeRole(bytes32 role, address account) internal {
        if (!_roles[role][account]) revert MissingRole(role, account);

        _roles[role][account] = false;
        _roleMemberCount[role]--;

        emit RoleRevoked(role, account, msg.sender);
    }

    // ============ Admin Functions ============

    /**
     * @notice Grant a role to an account
     * @param role The role to grant
     * @param account The account to grant the role to
     */
    function grantRole(bytes32 role, address account) external onlyOwner {
        _grantRole(role, account);
    }

    /**
     * @notice Revoke a role from an account
     * @param role The role to revoke
     * @param account The account to revoke the role from
     */
    function revokeRole(bytes32 role, address account) external onlyOwner {
        _revokeRole(role, account);
    }

    /**
     * @notice Renounce a role (caller removes their own role)
     * @param role The role to renounce
     */
    function renounceRole(bytes32 role) external {
        _revokeRole(role, msg.sender);
    }

    // ============ View Functions ============

    /**
     * @notice Check if an account has a role
     * @param role The role to check
     * @param account The account to check
     * @return hasRoleResult Whether the account has the role
     */
    function hasRole(bytes32 role, address account) public view returns (bool hasRoleResult) {
        // Owner has all roles implicitly
        if (account == owner) return true;
        return _roles[role][account];
    }

    /**
     * @notice Get the number of members for a role
     * @param role The role to check
     * @return count Number of members (excluding owner)
     */
    function getRoleMemberCount(bytes32 role) external view returns (uint256 count) {
        return _roleMemberCount[role];
    }
}
