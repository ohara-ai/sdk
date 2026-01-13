// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/**
 * @title IHeap
 * @notice Interface for the Heap token collection feature
 * @dev Allows games to collect tokens on a heap that emits events consumed in-game
 */
interface IHeap {
    /// @notice Emitted when a new heap is created
    event HeapCreated(
        uint256 indexed heapId,
        address indexed creator,
        address token,
        uint256 contributionAmount,
        uint256 maxContributions
    );

    /// @notice Emitted when a user contributes to a heap
    event ContributionAdded(uint256 indexed heapId, address indexed contributor, uint256 amount, uint256 totalContributions);

    /// @notice Emitted when a contribution is withdrawn before activation
    event ContributionWithdrawn(uint256 indexed heapId, address indexed contributor, uint256 amount);

    /// @notice Emitted when a heap is activated
    event HeapActivated(uint256 indexed heapId, address[] contributors);

    /// @notice Emitted when a heap is finalized
    event HeapFinalized(
        uint256 indexed heapId,
        address indexed winner,
        uint256 totalAmount,
        uint256 winnerAmount
    );

    /// @notice Emitted when a heap is cancelled
    event HeapCancelled(uint256 indexed heapId, address[] contributors, uint256 refundAmount);

    /// @notice Heap status
    enum HeapStatus {
        Open,
        Active,
        Finalized,
        Cancelled
    }

    /// @notice Heap data structure
    struct Heap {
        address token;
        uint256 contributionAmount;
        uint256 maxContributions;
        address[] contributors;
        mapping(address => uint256) contributions;
        HeapStatus status;
        address winner;
        uint256 createdAt;
    }

    /**
     * @notice Create a new heap with specified parameters
     * @param token Token address for contributions (address(0) for native token)
     * @param contributionAmount Required contribution amount per user
     * @param maxContributions Maximum number of contributions allowed
     * @return heapId The ID of the created heap
     */
    function create(
        address token,
        uint256 contributionAmount,
        uint256 maxContributions
    ) external payable returns (uint256 heapId);

    /**
     * @notice Contribute to an existing open heap
     * @param heapId The ID of the heap to contribute to
     */
    function contribute(uint256 heapId) external payable;

    /**
     * @notice Withdraw contribution from an open heap before activation
     * @param heapId The ID of the heap to withdraw from
     */
    function withdraw(uint256 heapId) external;

    /**
     * @notice Activate a heap (controller only)
     * @param heapId The ID of the heap to activate
     */
    function activate(uint256 heapId) external;

    /**
     * @notice Finalize a heap with a winner (controller only)
     * @param heapId The ID of the heap to finalize
     * @param winner Address of the winning contributor (address(0) for refund all)
     */
    function finalize(uint256 heapId, address winner) external;

    /**
     * @notice Cancel an active heap and refund all contributors (controller only)
     * @param heapId The ID of the heap to cancel
     */
    function cancel(uint256 heapId) external;

    /**
     * @notice Get heap details
     * @param heapId The ID of the heap
     */
    function getHeap(
        uint256 heapId
    )
        external
        view
        returns (
            address token,
            uint256 contributionAmount,
            uint256 maxContributions,
            address[] memory contributors,
            HeapStatus status,
            address winner,
            uint256 createdAt
        );

    /**
     * @notice Get a contributor's contribution in a heap
     * @param heapId The ID of the heap
     * @param contributor The contributor's address
     */
    function getContribution(uint256 heapId, address contributor) external view returns (uint256);
}
