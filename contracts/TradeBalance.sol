// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.6.0 <0.8.0;

contract TradeBalance {
    event BalanceUpdated(
        address account,
        uint balance_prev,
        uint balance_current
    );

    mapping(address => uint) accountBalance;

    function deposit() public payable
    {
        depositIncrement(msg.sender, msg.value);
    }

    function balance() public view returns (uint)
    {
        return accountBalance[msg.sender];
    }

    function balanceByAccount(address _account) public view returns (uint)
    {
        return accountBalance[_account];
    }

    function depositIncrement(address _account, uint _amount) internal
    {
        depositUpdate(_account, _amount, false);
    }

    function depositDecrement(address _account, uint _amount) internal
    {
        depositUpdate(_account, _amount, true);
    }

    function depositUpdate(address _account, uint _amount, bool _decrement) private
    {
        require(
            _amount > 0,
            "Balance: amount must be more zero"
        );
        uint _balance_prev = accountBalance[_account];
        if (_decrement) {
            accountBalance[_account] -= _amount;
        } else {
            accountBalance[_account] += _amount;
        }
        emit BalanceUpdated(_account, _balance_prev, accountBalance[_account]);
    }
}
