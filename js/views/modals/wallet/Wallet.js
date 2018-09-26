// import $ from 'jquery';
// import { getSocket } from '../../../utils/serverConnect';
// import { recordEvent } from '../../../utils/metrics';
import {
  isSupportedWalletCur,
  ensureMainnetCode,
} from '../../../data/walletCurrencies';
import { polyTFallback } from '../../../utils/templateHelpers';
import app from '../../../app';
import loadTemplate from '../../../utils/loadTemplate';
// import Spend from '../../../models/wallet/Spend';
// import Transactions from '../../../collections/wallet/Transactions';
import BaseModal from '../BaseModal';
import CoinNav from './CoinNav';
import CoinStats from './CoinStats';
import SendReceiveNav from './SendReceiveNav';
import SendMoney from './SendMoney';
import ReceiveMoney from './ReceiveMoney';

export default class extends BaseModal {
  constructor(options = {}) {
    let navCoins = [];

    if (app && app.walletBalances) {
      navCoins = app.walletBalances.toJSON()
        .filter(balanceObj => isSupportedWalletCur(balanceObj.code))
        .sort((a, b) => {
          const getDisplayName = code => polyTFallback(`cryptoCurrencies.${code}`, code);


          const aSortVal = getDisplayName(a.code);
          const bSortVal = getDisplayName(b.code);

          if (aSortVal < bSortVal) return -1;
          if (aSortVal > bSortVal) return 1;
          return 0;
        });
    }

    const initialActiveCoin = navCoins.length && navCoins[0] &&
        navCoins[0].code || 'BTC';
    const opts = {
      initialActiveCoin,
      initialSendModeOn: true,
      ...options,
    };

    super(opts);
    this._activeCoin = opts.initialActiveCoin;
    this._sendModeOn = opts.initialSendModeOn;
    this._sendMoneyVws = {};
    this._receiveMoneyVws = {};

    this.navCoins = navCoins.map(coin => {
      const code = coin.code;

      return {
        active: code === opts.initialNavCoin,
        code,
        name: polyTFallback(`cryptoCurrencies.${code}`, code),
        balance: coin.confirmed,
      };
    });

    this.coinNav = this.createChild(CoinNav, {
      initialState: {
        coins: this.navCoins,
        active: this.activeCoin,
      },
    }).render();

    this.listenTo(this.coinNav, 'coinSelected', e => {
      this.activeCoin = e.code;
    });

    this.coinStats = this.createChild(CoinStats, {
      initialState: this.coinStatsState,
    }).render();

    this.sendReceiveNav = this.createChild(SendReceiveNav, {
      initialState: this.sendReceivNavState,
    }).render();

    this.listenTo(this.sendReceiveNav, 'click-send', () => {
      this.sendModeOn = true;
    });

    this.listenTo(this.sendReceiveNav, 'click-receive', () => {
      this.sendModeOn = false;
    });
  }

  className() {
    return `${super.className()} wallet modalScrollPage`;
  }

  // events() {
  //   return {
  //     'click .js-toggleSendReceive': 'onClickToggleSendReceive',
  //     ...super.events(),
  //   };
  // }

  // remove() {
  //   this.addressFetches.forEach(fetch => fetch.abort());
  //   super.remove();
  // }

  /**
   * Indicates which coin is currently active. The remaining interface (coinStats,
   * Send/Receive, Transactions, etc...) will be in the context of this coin.
   */
  get activeCoin() {
    return this._activeCoin;
  }

  set activeCoin(coin) {
    if (coin !== this._activeCoin) {
      this._activeCoin = coin;
      this.coinNav.setState({ active: coin });
      this.coinStats.setState(this.coinStatsState);
    }
  }

  /**
   * True indicates that the wallet interface has the Send tab (as opposed to Recieve)
   * active for the selected activeCoin.
   */
  get sendModeOn() {
    return this._sendModeOn;
  }

  set sendModeOn(bool) {
    const normalizedBool = !!bool;

    if (normalizedBool !== this._sendModeOn) {
      this._sendModeOn = normalizedBool;
      this.sendReceiveNav.setState(this.sendReceivNavState);
      this.renderSendReceiveVw();
    }
  }

  get coinStatsState() {
    const activeCoin = this.activeCoin;
    const balance = app && app.walletBalances &&
      app.walletBalances.get(activeCoin);

    return {
      cryptoCur: ensureMainnetCode(activeCoin),
      displayCur: app && app.settings && app.settings.get('localCurrency') ||
        'USD',
      confirmed: balance && balance.get('confirmed'),
      unconfirmed: balance && balance.get('unconfirmed'),
      transactionCount: 28,
    };
  }

  get sendReceivNavState() {
    return { sendModeOn: this.sendModeOn };
  }

  getSendMoneyVw(coinType = this.activeCoin) {
    if (typeof coinType !== 'string' || !coinType) {
      throw new Error('Please provide the coinType as a string.');
    }

    if (this._sendMoneyVws[coinType]) {
      return this._sendMoneyVws[coinType];
    }

    this._sendMoneyVws[coinType] = this.createChild(SendMoney, {
      coinType,
    })
      .render();

    return this._sendMoneyVws[coinType];
  }

  getReceiveMoneyVw(coinType = this.activeCoin) {
    if (typeof coinType !== 'string' || !coinType) {
      throw new Error('Please provide the coinType as a string.');
    }

    if (this._receiveMoneyVws[coinType]) {
      return this._receiveMoneyVws[coinType];
    }

    this._receiveMoneyVws[coinType] = this.createChild(ReceiveMoney, {
      initialState: { coinType },
    })
      .render();

    return this._receiveMoneyVws[coinType];
  }

  renderSendReceiveVw() {
    if (this.sendModeOn) {
      this.getCachedEl('.js-sendReceiveContainer')
        .html(this.getSendMoneyVw().el);
    } else {
      this.getCachedEl('.js-sendReceiveContainer')
        .html(this.getReceiveMoneyVw().el);
    }
  }

  render() {
    loadTemplate('modals/wallet/wallet.html', t => {
      loadTemplate('walletIcon.svg', (walletIconTmpl) => {
        this.$el.html(t({
          walletIconTmpl,
        }));

        super.render();

        this.coinNav.delegateEvents();
        this.getCachedEl('.js-coinNavContainer').html(this.coinNav.el);

        this.coinStats.delegateEvents();
        this.getCachedEl('.js-coinStatsContainer').html(this.coinStats.el);

        this.sendReceiveNav.delegateEvents();
        this.getCachedEl('.js-sendReceiveNavContainer').html(this.sendReceiveNav.el);

        this.renderSendReceiveVw();
      });
    });

    return this;
  }
}
