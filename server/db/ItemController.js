var moment = require('moment');
var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport('smtps://automated.tickrtaker%40gmail.com:ticktock@smtp.gmail.com');
module.exports = (db, Sequelize, User) => {
  endDateDefault = moment().add(8, 'seconds');
  // console.log(endDateDefault);
  
  var Item = db.define('item', {
    title: {type: Sequelize.TEXT, allowNull: false},
    description: Sequelize.TEXT,
    picture: Sequelize.TEXT,
    startDate: {type: Sequelize.DATE, defaultValue: Sequelize.NOW},
    endDate: {type: Sequelize.DATE, allowNull: false, defaultValue: endDateDefault},
    startPrice: {type: Sequelize.FLOAT, allowNull: false},
    endPrice: {type: Sequelize.FLOAT, allowNull: false},
    minimumBidIncrement: {type: Sequelize.FLOAT, defaultValue: 1},
    auctionEndDateByHighestBid: {type: Sequelize.DATE, allowNull: false, defaultValue: endDateDefault},
    valid: {type: Sequelize.BOOLEAN, defaultValue: true}
  });

  const checkValidItems = () => {
    Item.findAll({where: {valid: true}})
    .then(function(currentItems) {
      currentItems.forEach((aCurrentItem) => {
        if (Date.parse(new Date(aCurrentItem.dataValues.endDate)) < Date.parse(Date())) {
          console.log('it is less than val');
          // User.findOne({where: {id: aCurrentItem.userId}})
          // .then(function(seller) {
          //   aCurrentItem.getBids({raw: true}).then(function(bids) {
          //     var highestBid = {price: 0};
          //     bids.forEach(function(bid) {
          //       if (bid.price > highestBid.price) {
          //         highestBid = bid;
          //       }
          //     });

          //     User.find({where: {id: highestBid.userId}, raw:true})
          //     .then(function(highestBidder) {
          //       var text;
          //       if(highestBidder === null) {
          //         text = 'Sorry, no one bid on your item. Better luck next time.';
          //       } else {
          //         text = `Your auction has been completed! ${highestBidder.name} is willing to pay $${highestBid.price}. Contact them at ${highestBidder.email}`;
          //       }
          //       var mailOptions = {
          //         from: 'automated.tickrtaker@gmail.com',
          //         to: seller.dataValues.email,
          //         subject: `Completed Auction of "${aCurrentItem.dataValues.title}"`,
          //         text: text
          //       };
          //       transporter.sendMail(mailOptions, function(error, info) {
          //         if(error) {
          //           console.log('could not send the email', error);
          //         } else {
          //           console.log(info);
          //         }
          //       });
          //     });
          //   });
          // });
          aCurrentItem.update({valid: false});
        }
      });
    });
  };
  
  setInterval(checkValidItems, 10000);

  const getAllItems = (req, res, next) => {
    var searchQuery = req.query.search || '';
    Item.findAll(
      {where: {
        valid: true,
        $or: [
          {'title': {like: '%' + searchQuery + '%'}},
          {'description': {like: '%' + searchQuery + '%'}}
        ]
      }, raw: true})
    .then(function(items) {
      console.log(items);
      res.send(items);
    });
  };


  const getOneItem = (req, res, next, itemId) => {
    Item.findOne({where: {id: itemId}, raw: true})
    .then(function(item) {
      res.send(item);
    });
  };
  
  const getItemsForSale = (req, res, next) => {
    User.findOne({where: {id: req.body.user.id}})
    .then(function(user) {
      user.getItems({where: {valid: true}, raw: true})
      .then(function(items) {
        console.log(items);
        res.send(items);
      });  
    });
  };

  const validateUrl = (value) => {
      // Copyright (c) 2010-2013 Diego Perini, MIT licensed
      // https://gist.github.com/dperini/729294
    return /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})).?)(?::\d{2,5})?(?:[/?#]\S*)?$/i.test( value );
  };

  const validateItem = (item) => {
    console.log('i am validating your item');
    return ((item.startPrice > item.endPrice) &&
            (item.startPrice > 0) &&
            (item.endPrice >= 0) &&
            (validateUrl(item.picture)));
            // (typeof item.endDate) === Date);
  };

  const putItemForSale = (req, res, next) => {
    console.log(req.body);
    // console.log('this is the body of the request', req.body);
    if (validateItem(req.body.item)) {
      console.log('item date', req.body.item.endDate);
      console.log('a valid item has been passed');
      User.findOne({where: {id: req.body.user.id}})
      .then(function(user) {
        req.body.item.auctionEndDateByHighestBid = req.body.item.endDate;
        Item.create(req.body.item)
          .then(function(item) {
            user.addItem(item);
            res.send('created new item');
          }); 
      });
    } else {
      res.send('failed to create new item');
    }
  };

  const removeItemFromSale = (req, res, next) => {
    console.log('removing item');
    User.findOne({where: {id: req.body.user.id}})
    .then(function(user) {
      user.getItems().then(function(items) {
        items.forEach(function(item) {
          if (item.id === req.body.item.id) {
            item.destroy().then(function(item) {
              var deleted = true;
              res.send(item);
            });
          }
        });
      });
      // Item.destroy({where: {id: req.body.item.id} })
      //   .then(function(item) {
      //     console.log(item);
      //     res.send('removed the item' + item);
      //   })
      //   .catch(function(error) {
      //     res.send('failed to remove item due to error ' + error);
      //   });
    });
  };

  return {
    Item: Item,
    getItemsForSale: getItemsForSale,
    getAllItems: getAllItems,
    putItemForSale: putItemForSale,
    removeItemFromSale: removeItemFromSale,
    getOneItem: getOneItem
  };
};