'use strict';

const bitcoin = require('bitcoin');
let config = require('config');
let spamchannel = config.get('moderation').botspamchannel
config = config.get('lbrycrd');
const lbry = new bitcoin.Client(config);
;

exports.commands = [
  "tip",
  "multitip",
  "roletip"
]
exports.tip = {
  usage: "<subcommand>",
  description: "**!tip** : Displays This Message\n    **!tip balance** : get your balance\n    **!tip deposit** : get address for your deposits\n    **!tip withdraw <ADDRESS> <AMOUNT>** : withdraw coins to specified address\n    **!tip <@user> <amount>** :mention a user with @ and then the amount to tip them\n    **!tip private <user> <amount>** : put private before Mentioning a user to tip them privately.\n   ** <> : Replace with appropriate value.**",
  process: async function (bot, msg, suffix) {
    let tipper = msg.author.id.replace('!', ''),
      words = msg.content.trim().split(' ').filter(function (n) { return n !== ""; }),
      subcommand = words.length >= 2 ? words[1] : 'help',
      helpmsg = '**!tip** : Displays This Message\n    **!tip balance** : get your balance\n    **!tip deposit** : get address for your deposits\n    **!tip withdraw <ADDRESS> <AMOUNT>** : withdraw coins to specified address\n    **!tip <@user> <amount>** :mention a user with @ and then the amount to tip them\n    **!tip private <user> <amount>** : put private before Mentioning a user to tip them privately.\n    **!multitip** : Displays This Message Below\n' +
      '    **!multitip <@user1> <@user2> <amount>** : Mention one or more users in a row, seperated by spaces, then an amount that each mentioned user will receive.\n    **!multitip private <@user1> <@user2> <amount>** : Put private before Mentioning one or more users to have each user tipped privately.\n    **!roletip** : Displays This Message Below\n    **!roletip <@role> <amount>** : Mention a single role, then an amount that each user in that role will receive.\n    **!tip private <@role> <amount>** : Put private before the role to have each user tipped privately.\n    **<> : Replace with appropriate value.**',
      channelwarning = 'Please use <'+ spamchannel + '> or DMs to talk to bots.';
    switch (subcommand) {
      case 'help': privateOrSandboxOnly(msg, channelwarning, doHelp, [helpmsg]); break;
      case 'balance': doBalance(msg, tipper); break;
      case 'deposit': privateOrSandboxOnly(msg, channelwarning, doDeposit, [tipper]); break;
      case 'withdraw': privateOrSandboxOnly(msg, channelwarning, doWithdraw, [tipper, words, helpmsg]); break;
      default: doTip(msg, tipper, words, helpmsg);
    }
  }
}

exports.multitip = {
  usage: "<subcommand>",
  description: "**!multitip** : Displays This Message\n    **!multitip <@user1> <@user2> <amount>** : Mention one or more users in a row, seperated by spaces, then an amount that each mentioned user will receive.\n    **!multitip private <@user1> <@user2> <amount>** : Put private before Mentioning one or more users to have each user tipped privately.\n    ** <> : Replace with appropriate value.**",
  process: async function (bot, msg, suffix) {
    let tipper = msg.author.id.replace('!', ''),
        words = msg.content.trim().split(' ').filter(function (n) { return n !== ""; }),
        subcommand = words.length >= 2 ? words[1] : 'help',
        helpmsg = '**!multitip** : Displays This Message\n    **!multitip <@user1> <@user2> <amount>** : Mention one or more users in a row, seperated by spaces, then an amount that each mentioned user will receive.\n    **!multitip private <@user1> <@user2> <amount>** : Put private before Mentioning one or more users to have each user tipped privately.\n    ** <> : Replace with appropriate value.**',
        channelwarning = 'Please use <'+ spamchannel + '> or DMs to talk to bots.';
    switch(subcommand) {
      case 'help': privateOrSandboxOnly(msg, channelwarning, doHelp, [helpmsg]); break;
      default: doMultiTip(msg, tipper, words, helpmsg); break;
    }
  }
}


exports.roletip = {
  usage: "<subcommand>",
  description: "**!roletip** : Displays This Message\n    **!roletip <@role> <amount>** : Mention a single role, then an amount that each user in that role will receive.\n    **!tip private <@role> <amount>** : Put private before the role to have each user tipped privately.\n    ** <> : Replace with appropriate value.**",
  process: async function (bot, msg, suffix) {
    let tipper = msg.author.id.replace('!', ''),
        words = msg.content.trim().split(' ').filter(function (n) { return n !== ""; }),
        subcommand = words.length >= 2 ? words[1] : 'help',
        helpmsg = '**!roletip** : Displays This Message\n    **!roletip <@role> <amount>** : Mention a single role, then an amount that each user in that role will receive.\n    **!tip private <@role> <amount>** : Put private before the role to have each user tipped privately.\n    ** <> : Replace with appropriate value.**',
        channelwarning = 'Please use <'+ spamchannel + '> or DMs to talk to bots.';
    switch(subcommand) {
      case 'help': privateOrSandboxOnly(msg, channelwarning, doHelp, [helpmsg]); break;
      default: doRoleTip(msg, tipper, words, helpmsg); break;
    }
  }
}


function privateOrSandboxOnly(message, wrongchannelmsg, fn, args) {
  if (!inPrivateOrBotSandbox(message)) {
    message.reply(wrongchannelmsg);
    return;
  }
  fn.apply(null, [message, ...args]);
}


function doHelp(message, helpmsg) {
  message.author.send(helpmsg);
}


function doBalance(message, tipper) {
  lbry.getBalance(tipper, 1, function (err, balance) {
    if (err) {
      message.reply('Error getting balance.').then(message => message.delete(5000));
    }
    else {
      message.reply('You have *' + balance + '* LBC');
    }
  });
}


function doDeposit(message, tipper) {
  getAddress(tipper, function (err, address) {
    if (err) {
      message.reply('Error getting your deposit address.').then(message => message.delete(5000));
    }
    else {
      message.reply('Your address is ' + address);
    }
  });
}


function doWithdraw(message, tipper, words, helpmsg) {
  if (words.length < 4) {
    doHelp(message, helpmsg);
    return;
  }

  var address = words[2],
      amount = getValidatedAmount(words[3]);

  if (amount === null) {
    message.reply('I dont know how to withdraw that many coins...').then(message => message.delete(5000));
    return;
  }

  lbry.sendFrom(tipper, address, amount, function (err, txId) {
    if (err) {
      message.reply(err.message).then(message => message.delete(5000));
    }
    else {
      message.reply('You withdrew ' + amount + ' LBC to ' + address + '\n' + txLink(txId) + '\n');
    }
  });
}


function doTip(message, tipper, words, helpmsg) {
  if (words.length < 3 || !words) {
    doHelp(message, helpmsg);
    return;
  }

  var prv = false;
  var amountOffset = 2;
  if (words.length >= 4 && words[1] === 'private') {
    prv = true;
    amountOffset = 3;
  }

  let amount = getValidatedAmount(words[amountOffset]);

  if (amount === null) {
    message.reply('I dont know how to tip that many coins...').then(message => message.delete(5000));
    return;
  }

  if (message.mentions.users.first().id) {
    sendLBC(message, tipper, message.mentions.users.first().id.replace('!', ''), amount, prv);
  }
  else {
    message.reply('Sorry, I could not find a user in your tip...').then(message => message.delete(5000));
  }
}


function doMultiTip(message, tipper, words, helpmsg) {
  if (!words) {
    doHelp(message, helpmsg);
    return;
  }
  if (words.length < 4) {
    doTip(message, tipper, words, helpmsg);
    return;
  }
  var prv = false;
  if (words.length >= 5 && words[1] === 'private') {
    prv = true;
  }
  let [userIDs, amount] = findUserIDsAndAmount(message, words);
  if (amount == null) {
    message.reply('I don\'t know how to tip that many coins...').then(message => message.delete(5000));
    return;
  }
  if (!userIDs) {
    message.reply('Sorry, I could not find a user in your tip...').then(message => message.delete(5000));
    return;
  }
  for (var i = 0; i < userIDs.length; i++) {
    sendLBC(message, tipper, userIDs[i], amount, prv);
  }
}


function doRoleTip(message, tipper, words, helpmsg) {
  if (!words || words.length < 3) {
    doHelp(message, helpmsg);
    return;
  }
  var prv = false;
  var amountOffset = 2;
  if (words.length >= 4 && words[1] === 'private') {
    prv = true;
    amountOffset = 3;
  }
  let amount = getValidatedAmount(words[amountOffset]);
  if (amount == null) {
    message.reply('I don\'t know how to tip that many coins...').then(message => message.delete(5000));
    return;
  }
  if (message.mentions.roles.first().id) {
    if (message.mentions.roles.first().members.first().id) {
      let userIDs = message.mentions.roles.first().members.map(member => member.user.id.replace('!', ''));
      for (var i = 0; i < userIDs.length; i++) {
        sendLBC(message, tipper, userIDs[i], amount, prv);
      }
      return;
    }
    else {
      message.reply('Sorry, I could not find any users to tip in that role...').then(message => message.delete(5000));
      return;
    }
  }
  else {
    message.reply('Sorry, I could not find any roles in your tip...').then(message => message.delete(5000));
    return;
  }
}


function findUserIDsAndAmount(message, words) {
  var idList = [];
  var amount = null;
  var amount = words.pop()
  message.mentions.users.forEach(function(user){idList.push(user.id.replace('!', ''));});
  return [idList, amount];
}


function sendLBC(message, tipper, recipient, amount, privacyFlag) {
  getAddress(recipient, function (err, address) {
    if (err) {
      message.reply(err.message).then(message => message.delete(5000));
    }
    else {
      lbry.sendFrom(tipper, address, amount, 1, null, null, function (err, txId) {
        if (err) {
          message.reply(err.message).then(message => message.delete(5000));
        }
        else {
          if (privacyFlag) {
            var imessage =
              ' You privately tipped ' + message.mentions.users.first().username + ' ' + amount + ' RVN\n' + txLink(txId) + '\n' +
              'DM me `!tip` for rvnTIpper instructions.'
            if (message.content.startsWith("!tip private ") || message.content.startsWith("!multitip private ") || message.content.startsWith("!roletip private ")) {
               message.delete(1000); //Supposed to delete message
            }
            message.author.send(imessage);
            if (message.author.id != message.mentions.users.first().id) {
              var iimessage =
                ' You got privately tipped ' + amount + ' RVN\n' + txLink(txId) + '\n' +
                'DM me `!tip` for rvnTIpper instructions.'
              message.mentions.users.first().send(iimessage);
            }
          } else {
            var iiimessage =
              ' tipped <@' + recipient + '> ' + amount + ' RVN\n' + txLink(txId) + '\n' +
              'DM me `!tip` for rvnTIpper instructions.'
            message.reply(iiimessage);
          }
        }
      });
    }
  });
};


function getAddress(userId, cb) {
  lbry.getAddressesByAccount(userId, function (err, addresses) {
    if (err) {
      cb(err);
    }
    else if (addresses.length > 0) {
      cb(null, addresses[0]);
    }
    else {
      lbry.getNewAddress(userId, function (err, address) {
        if (err) {
          cb(err);
        }
        else {
          cb(null, address);
        }
      });
    }
  });
}


function inPrivateOrBotSpam(msg) {
  if ((msg.channel.type == 'dm') || (msg.channel.id === spamchannel)) {
    return true;
  } else {
    return false;
  }
}


function getValidatedAmount(amount) {
  amount = amount.trim();
  if (amount.toLowerCase().endsWith('rvn')) {
    amount = amount.substring(0, amount.length - 3);
  }
  return amount.match(/^[0-9]+(\.[0-9]+)?$/) ? amount : null;
}


function txLink(txId) {
  return "https://explorer.lbry.io/tx/" + txId;
}
