
function getStatusMessage(status){
  const messages = {"OK":"success",
                  "WRONG_PREV_HASH": "prev_hash of first block doesn't match my last_hash",
                  "NO_NEIGHBOURS":"no neighbours available for syncing, please add some",
                  "UNKNOWN":"unknown error",
                  "BLOCK_ALREADY_PRESENT" :"this block is already present in my blockchain",
                  "MY_SEQUENCE_LONGER" : " i have longer sequence of blocks",
                  "NEED_SYNC": "this node need to be synced",
                  "PREV_HASH_MISMATCH":" prev hash of update block doesn't match ours sequence, may be this node is out of sync",
                  "INNER_ERROR":"some inner error happened",
                };
  return messages[status] ? messages[status]:"unknown";
}
module.exports = function(app,logic){

    app.get('/', function(req,res){
      logic.get_blocks(10,function(blocks){
        res.render('index',{ballnces:logic.get_ballances(), blocks:blocks, state:logic.get_state()});
      });
    });
    app.get('/about', function(req,res){
      res.render('about',{state:logic.get_state()});
    });
    app.get('/blocks', function(req,res){
      logic.get_blocks(10,function(blocks){
        res.render('blocks',{blocks: blocks, transactions:logic.get_pending_transactions(), state:logic.get_state()});
      });
    });
    app.get('/ballances', function(req,res){
      res.render('ballances',{ballances:logic.get_ballances(), state:logic.get_state()});
    });
    app.get('/neighbours', function(req,res){
      res.render('neighbours',{neighbours:logic.get_neighbours(), state:logic.get_state()});
    });

    //blockchain
    /*app.post('/api/add_block',function(req,res){
      logic.add_block(req.body.block, function(success,status){
        res.send({success:success, status:status, message:getStatusMessage(status)});
      });
    });*/
    app.post('/blockchain/receive_update',function(req,res){
        logic.receive_update(req.body, function(success,status){
          console.log('receive_update done, sending response');
          res.send({success:success, status:status, message:getStatusMessage(status)});
        });
    });

    //read data
    app.get('/blockchain/get_blocks/:num_blocks',function(req,res){
      logic.get_blocks(req.params.num_blocks,function(response){
        console.log('get_blocks send', response);
        res.send(response);
      });
    });
    app.get('/management/state',function(req,res){
        res.send(logic.get_state());
    });

    //management
    app.post('/management/add_transaction',function(req,res){

      logic.add_tx(req.body,function( success, status){
        res.send({success:success, status:status, message:getStatusMessage(status)});
      });
    });
    app.post('/management/add_link', function(req,res){
      logic.add_neighbour(req.body,function(success,status){
        res.send({success:success, status:status, message:getStatusMessage(status)})
      });
    });
    app.delete('/management/remove_link/:id',function(req,res){
      logic.remove_neighbour(req.params.id,function(success,status){
        res.send({success:success, status:status, message:getStatusMessage(status)});
      })
    });
    app.get('/management/sync',function(req,res){
      logic.initial_sync(function(success,status){
        res.send({success:success, status:status, message:getStatusMessage(status)});
      })
    });

}
