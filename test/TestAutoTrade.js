const AutoTrade = artifacts.require('AutoTrade');
const truffleAssert = require('truffle-assertions');
const BigNumber = require('bignumber.js');

function bn(number) {
  return new BigNumber(number);
}

const eth = bn(10).pow(18);

// const OfferStateFinished = 0;
const OfferStateRejected = 1;
const OfferStateProposed = 2;
const OfferStateAccepted = 3;
const OfferStateApproved = 4;


contract('AutoTrade', (accounts) => {
  const contractOwner = accounts[0];
  const client1 = accounts[1];
  const client2 = accounts[2];
  const proposer1 = accounts[3];
  const proposer2 = accounts[4];

  let instance;

  before(async () => {
    instance = await AutoTrade.deployed();
  });

  describe('1.1 Any User can top up the contract for any amount', async () => {
    it('Balance: amount must be more zero', async () => {
      assert.equal(0, (await instance.balanceByAccount(client2)).valueOf());
      assert.equal(0, (await instance.balance({from: client2})).valueOf());

      const depositRequire = 'Balance: amount must be more zero';
      try {
        await instance.deposit({from: client2});
        assert.equal(depositRequire, '');
      } catch (error) {
        assert.equal(depositRequire, error.reason);
      }

      assert.equal(0, (await instance.balanceByAccount(client2)).valueOf());
      assert.equal(0, (await instance.balance({from: client2})).valueOf());
    });

    it('Balance: updated', async () => {
      const amount = eth.multipliedBy(10);
      assert.equal(0, (await instance.balanceByAccount(client1)).valueOf());
      assert.equal(0, (await instance.balance({from: client1})).valueOf());

      const tx = await instance.deposit({from: client1, value: amount});
      // truffleAssert.prettyPrintEmittedEvents(tx, 'BalanceUpdated');
      truffleAssert.eventEmitted(tx, 'BalanceUpdated', (event) => {
        return event.account === client1 &&
            !bn(0).comparedTo(event.balance_prev) &&
            !amount.comparedTo(event.balance_current);
      });

      assert.equal(amount.valueOf(), (await instance.balanceByAccount(client1)).valueOf());
      assert.equal(amount.valueOf(), (await instance.balance({from: client1})).valueOf());
    });
  });

  describe('1.2 Any User can create offer to convert into stablecoin', async () =>{
    it('Offer: need amounts more zero', async () => {
      const amountRequire = 'Offer: need amounts more zero';
      try {
        await instance.offerPropose(0, 1, {from: proposer1});
        assert.equal(amountRequire, '');
      } catch (error) {
        assert.equal(amountRequire, error.reason);
      }
    });

    it('Offer: updated', async () => {
      const amountForm = eth.multipliedBy(10);
      const amountTo = eth.multipliedBy(5);

      const tx = await instance.offerPropose(amountForm, amountTo, {from: proposer1});
      truffleAssert.eventEmitted(tx, 'OfferUpdated', (event) => {
        return event.account === proposer1 &&
            parseInt(event.state) === OfferStateProposed &&
            !amountForm.comparedTo(event.amount_from) &&
            !amountTo.comparedTo(event.amount_to);
      });
    });
  });

  describe('1.3 Contract Owner can approve the offer to convert into stablecoin', async () => {
    it('User can not approve', async () => {
      const ownerRequire = 'Ownable: caller is not the owner';
      try {
        const offer = await instance.offerByAccount(proposer1);
        await instance.offerAccept(proposer1, bn(offer[1]), bn(offer[2]), {from: client1});
        assert.equal(ownerRequire, '');
      } catch (error) {
        assert.equal(ownerRequire, error.reason);
      }
    });

    it('Owner can approve', async () => {
      const offer = await instance.offerByAccount(proposer1);
      const amountForm = bn(offer[1]);
      const amountTo = bn(offer[2]);

      const tx = await instance.offerAccept(proposer1, amountForm, amountTo, {from: contractOwner});
      truffleAssert.eventEmitted(tx, 'OfferUpdated', (event) => {
        return event.account === proposer1 &&
            parseInt(event.state) === OfferStateApproved &&
            !amountForm.comparedTo(event.amount_from) &&
            !amountTo.comparedTo(event.amount_to);
      });
      truffleAssert.eventEmitted(tx, 'BalanceUpdated', (event) => {
        return event.account === proposer1 &&
            !bn(0).comparedTo(event.balance_prev) &&
            !amountForm.comparedTo(event.balance_current);
      });

      assert.equal(amountForm.valueOf(), (await instance.balanceByAccount(proposer1)).valueOf());
    });
  });

  describe('1.4 Contract Owner can approve the offer to convert into stablecoin with a reduction of the amount', async () => {
    it('Owner can approve with a reduction', async () => {
      const amountForm = eth.multipliedBy(10);
      const amountApprove = amountForm.minus(eth.multipliedBy(1));
      const amountTo = eth.multipliedBy(5);

      await instance.offerPropose(amountForm, amountTo, {from: proposer2});

      const tx = await instance.offerAccept(proposer2, amountApprove, amountTo, {from: contractOwner});
      truffleAssert.eventEmitted(tx, 'OfferUpdated', (event) => {
        return event.account === proposer2 &&
            parseInt(event.state) === OfferStateAccepted &&
            !amountApprove.comparedTo(event.amount_from) &&
            !amountTo.comparedTo(event.amount_to);
      });
    });
  });

  describe('1.5 Contract Owner can reject the offer to convert into stablecoin', async () => {
    it('User can not reject', async () => {
      const expected = 'Offer: caller must be the beneficiary';
      try {
        await instance.offerReject(proposer1, {from: client1});
        assert.equal(expected, '');
      } catch (error) {
        assert.equal(expected, error.reason);
      }
    });

    it('Owner can reject', async () => {
      const amount = eth.multipliedBy(10);
      assert.equal(amount.valueOf(), (await instance.balanceByAccount(proposer1)).valueOf());
      const tx = await instance.offerReject(proposer1, {from: contractOwner});
      truffleAssert.eventEmitted(tx, 'OfferUpdated', {account: proposer1});
      assert.equal(0, (await instance.balanceByAccount(proposer1)).valueOf());
    });
  });

  describe('1.6 The User can accept the offer', async () => {
    it('1.6 The User can accept the offer', async () => {
      const amount = eth.multipliedBy(9);
      assert.equal(0, (await instance.balanceByAccount(proposer2)).valueOf());
      const tx = await instance.offerApprove(proposer2, {from: proposer2});
      truffleAssert.eventEmitted(tx, 'OfferUpdated', {account: proposer2});
      truffleAssert.eventEmitted(tx, 'BalanceUpdated', {account: proposer2});
      assert.equal(amount.valueOf(), (await instance.balanceByAccount(proposer2)).valueOf());
    });
  });

  describe('1.7 Requesting User can reject the offer', async () => {
    it('Requesting User reject', async () => {
      const amount = eth.multipliedBy(9);
      assert.equal(amount.valueOf(), (await instance.balanceByAccount(proposer2)).valueOf());
      const tx = await instance.offerReject(proposer2, {from: contractOwner});
      truffleAssert.eventEmitted(tx, 'OfferUpdated', (event) => {
        return event.account === proposer2 &&
            parseInt(event.state) === OfferStateRejected;
      });
      truffleAssert.eventEmitted(tx, 'BalanceUpdated', {account: proposer2});
      assert.equal(0, (await instance.balanceByAccount(proposer2)).valueOf());
    });
  });

  describe('TODO 1.8 The User can delegate the offer to another person in the off-chain', async () => {
    it('TODO Open the payment channel', async () => {});
    it('TODO Signs messages', async () => {});
    it('TODO Closes the payment channel', async () => {});
  });
});
