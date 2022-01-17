const MainController = require('./MainController');
const TgAccounts = require('../models/TgTasks');

class tgAccountsController extends MainController{


}

const tgAccountsControllerCls = new tgAccountsController(TgAccounts);

module.exports = tgAccountsControllerCls;