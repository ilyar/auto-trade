// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./TradeBalance.sol";

contract AutoTrade is
TradeBalance,
Ownable {
    event OfferUpdated(
        address account,
        uint amount_from,
        uint amount_to,
        OfferState state
    );

    enum OfferState {
        Finished,
        Rejected,
        Proposed,
        Accepted,
        Approved
    }

    struct Offer {
        OfferState state;
        uint from;
        uint to;
    }

    mapping(address => Offer) accountOffer;

    modifier onlyOfferBeneficiary(address _account)
    {
        require(
            owner() == msg.sender || _account == msg.sender,
            "Offer: caller must be the beneficiary"
        );
        _;
    }

    modifier atOfferState(address _account, OfferState _stage)
    {
        require(
            accountOffer[_account].state == _stage,
            "Offer: cannot be called at this state"
        );
        _;
    }

    modifier lessOfferState(address _account, OfferState _stage)
    {
        require(
            accountOffer[_account].state < _stage,
            "Offer: cannot be called at this state"
        );
        _;
    }

    modifier moreOfferState(address _account, OfferState _stage)
    {
        require(
            accountOffer[_account].state > _stage,
            "Offer: cannot be called at this state"
        );
        _;
    }

    function offerByAccount(address _account) public view returns (OfferState, uint, uint)
    {
        Offer memory offer = accountOffer[_account];
        return (offer.state, offer.from, offer.to);
    }

    function offerPropose(uint _form_amount, uint _to_amount) public
    lessOfferState(msg.sender, OfferState.Proposed)
    {
        require(
            _form_amount > 0 && _to_amount > 0,
            "Offer: need amounts more zero"
        );

        accountOffer[msg.sender].state = OfferState.Proposed;
        accountOffer[msg.sender].from = _form_amount;
        accountOffer[msg.sender].to = _to_amount;
        emitOfferUpdated(msg.sender, accountOffer[msg.sender]);
    }

    function emitOfferUpdated(address _account, Offer memory _offer) private {
        emit OfferUpdated(
            _account,
            _offer.from,
            _offer.to,
            _offer.state
        );
    }

    function offerApprove(address _account) public
    onlyOfferBeneficiary(_account)
    moreOfferState(msg.sender, OfferState.Proposed)
    {
        Offer storage offer = accountOffer[_account];
        offer.state = OfferState.Approved;
        emitOfferUpdated(_account, offer);
        depositIncrement(_account, accountOffer[_account].from);
    }

    function offerAccept(address _account, uint _amount_form, uint _amount_to) public
    onlyOwner
    atOfferState(_account, OfferState.Proposed)
    {
        Offer storage offer = accountOffer[_account];
        if (offer.from != _amount_form || offer.to != _amount_to) {
            offer.state = OfferState.Accepted;
            offer.from = _amount_form;
            offer.to = _amount_to;
        } else {
            offer.state = OfferState.Approved;
            depositIncrement(_account, accountOffer[_account].from);
        }
        emitOfferUpdated(_account, offer);
    }

    function offerReject(address _account) public
    onlyOfferBeneficiary(_account)
    moreOfferState(_account, OfferState.Rejected)
    {
        accountOffer[_account].state = OfferState.Rejected;
        emitOfferUpdated(_account, accountOffer[_account]);
        depositDecrement(_account, accountOffer[_account].from);
    }
}
