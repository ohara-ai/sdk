// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title DevWorldToken
 * @notice ERC20 token for development and testing purposes
 * @dev A simple, mintable ERC20 token named DEVWORLD for use in development environments
 */
contract DevWorldToken {
    string public constant NAME = "DEVWORLD";
    string public constant SYMBOL = "DEVWORLD";
    uint8 public constant DECIMALS = 18;
    
    // ERC20 standard getters
    function name() public pure returns (string memory) {
        return NAME;
    }
    
    function symbol() public pure returns (string memory) {
        return SYMBOL;
    }
    
    function decimals() public pure returns (uint8) {
        return DECIMALS;
    }
    
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    address public owner;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    
    error Unauthorized();
    error InsufficientBalance();
    error InsufficientAllowance();
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }
    
    /**
     * @notice Initialize the DEVWORLD token with an initial supply
     * @param initialSupply The initial token supply (in wei units)
     */
    constructor(uint256 initialSupply) {
        owner = msg.sender;
        if (initialSupply > 0) {
            totalSupply = initialSupply;
            balanceOf[msg.sender] = initialSupply;
            emit Transfer(address(0), msg.sender, initialSupply);
        }
    }
    
    /**
     * @notice Mint new tokens (only owner can mint)
     * @param to Address to receive the minted tokens
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
    }
    
    /**
     * @notice Approve an address to spend tokens on behalf of msg.sender
     * @param spender Address authorized to spend
     * @param amount Amount of tokens they can spend
     * @return success True if approval was successful
     */
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    /**
     * @notice Transfer tokens to another address
     * @param to Recipient address
     * @param amount Amount of tokens to transfer
     * @return success True if transfer was successful
     */
    function transfer(address to, uint256 amount) external returns (bool) {
        if (balanceOf[msg.sender] < amount) revert InsufficientBalance();
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    /**
     * @notice Transfer tokens from one address to another
     * @param from Address to transfer from
     * @param to Address to transfer to
     * @param amount Amount of tokens to transfer
     * @return success True if transfer was successful
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        if (allowance[from][msg.sender] < amount) revert InsufficientAllowance();
        if (balanceOf[from] < amount) revert InsufficientBalance();
        
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
    
    /**
     * @notice Transfer ownership to a new address
     * @param newOwner Address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}
