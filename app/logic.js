const sha256 = require('sha256');
const axios = require('axios');
let redis = null;
let state = {tx:[], last_hash:0, hash:''};
let ballances = {
  data:{},
  init:function(){
    redis.get('ballances',function(err,res){
      if(err)console.log('redis error getting ballances', err);
      else{
        ballances.data = JSON.parse(res);
      }
    });
  },
  accept_block:function(block){
    block.tx.forEach(tx => {
      if(typeof this.data[tx.from] == 'undefined') this.data[tx.from] = 0;
      if(typeof this.data[tx.to] == 'undefined') this.data[tx.to] = 0;
      this.data[tx.from] -= tx.amount;
      this.data[tx.to] += tx.amount;
    });
    redis.set('ballances',JSON.stringify(this.data));
  },
  rollback_block:function(block){
    block.tx.forEach(tx => {
      if(typeof this.data[tx.from] == 'undefined') this.data[tx.from] = 0;
      if(typeof this.data[tx.to] == 'undefined') this.data[tx.to] = 0;
      this.data[tx.from] += tx.amount;
      this.data[tx.to] -= tx.amount;
    });
    redis.set('ballances',JSON.stringify(this.data));
  }
};
module.exports = {
  init:function(_redis, id, name, url){
    redis = _redis;
    redis.get('last_hash',function(err,res){
      if(!err && res){
        state.last_hash = res;
      }
      else{
        state.last_hash = 0;
      }
      console.log('initialization done, state.last_hash=',state.last_hash);
    });
    redis.get('neighbours',function(err,res){
      if(!err && res){
        state.neighbours = JSON.parse(res);
      }
      else{
        state.neighbours = [];
      }
    });
    state.id = id;
    state.name = name;
    state.url = url;
    ballances.init();

  },
  add_tx:function(data, done){
      if(state.tx.length < 5){
	data.amount = parseInt(data.amount);
        state.tx.push(data);
        if(state.tx.length >= 5){
          this._send_block(state,redis,done);
        }
        else{done(true,"OK");}
      }

  },
  receive_update(update,done){
    let sender_id = update.sender_id;

      redis.get(update.block.hash,(err,res) => {

        if(!res){
          if(update.block.prev_hash == state.last_hash){//TODO this how to check if this new branch attaches to some previous block and we need its depth
            //TODO if block exist in our store, skip it
            console.log('setting new block on top');
              redis.set(update.block.hash,JSON.stringify(update.block),(err,res) => {
                if(err) {
                  console.log('error saving to redis', err);
                  done(false,"INNER_ERROR");
                }
                else{
                  this._propagate_block(update.block, state.neighbours, sender_id);
                  state.last_hash = update.block.hash;
                  redis.set('last_hash',state.last_hash);
                  done(true, "OK");
                }
              });
          }
          else{
            //get last block,

            redis.get(state.last_hash,function(err,myblock){
              if(err ){
                console.log('error getting from redis',err);
                done(false,"INNER_ERROR");
              }
              else if(myblock){
                console.log('got prev block', myblock);
                myblock = JSON.parse(myblock);
                if(myblock.prev_hash == update.block.prev_hash){
                  //resolving conflict
                  if(myblock.ts < update.block.ts){
                    //leave our block
                    console.log('my block precedes');
                    done(false, "MY_BLOCK_PRECEDES")
                  }
                  else{
                    //prune our block and take their one
                    redis.del(state.prev_hash,function(err,res){
                      if(err){
                        console.log('redis error deleting',err);
                        done(false,"INNER_ERROR");
                      }
                      else{
                        redis.set(update.block.hash, JSON.stringify(update.block), function(err,res){
                          if(err){
                            console.log('redis error setting',err);
                            done(false,"INNER_ERROR");
                          }
                          else{
                            this._propagate_block(update.block,state.neighbours,sender_id);
                            //TODO here we might come to situation, when someone has our block and his block on top of it
                            //so he'll refuse this block and we'll have to revert to our original block and his update.
                            //however we suppose that once he has update, he'll already have sent it to us, so we also have it
                            //thus having 2 more blocks on top of root and should refuse this update.block
                            state.last_hash = update.block.hash;
                            redis.set('last_hash',state.last_hash);
                            done(true,"OK");
                          }
                        });
                      }

                    });
                  }
                }
                else{
                  //skippin update
                  console.log("skipping update, may be i'm out of sync ");
                  done(false,"PREV_HASH_MISMATCH");
                  //TODO send him our blocks
                  //this.get_blocks(hash_of_last_block,function(blocks){
                  //  reverse(blocks);
                  //  blocks.forEach(block => this.propagate_block(block,[sender_id],null))
                  //});
                }
              }
              else{
                console.log('having only initial block, while got some far away, need sync');
                done(false, "NEED_SYNC");
              }
            });//get(state.last_hash)

          }//else
        }
        else{
          done(false,'BLOCK_ALREADY_PRESENT')
        }
      });
  },
  get_blocks:function( total, done){
      let result = [];
      let processed = 0;
      let cur_hash = state.last_hash;
      if(!isNaN(parseInt(total))){
        total = parseInt(total);
      }
      else{total = 0;}
      const reducer = function(err, res){
        if(((total < 0)||(total > 0 && processed < total)) && cur_hash != 0 && res !== null){
          let block = JSON.parse(res);
	    block.ts = parseInt(block.ts);
          result.push(block);
          cur_hash = block.prev_hash;
          redis.get(cur_hash, reducer);
        }
        else{
          done(result);
        }
      }
      redis.get(cur_hash, reducer);
  },
  get_state:function(){
    return state;
  },
  initial_sync:function(done){
    if(state.neighbours.length > 0){

      axios.get(state.neighbours[0].url+"/blockchain/get_blocks/1000")
          .then(response => {
            console.log('initial_sync got',response.data);
            const blocks = response.data;
            redis.set('last_hash',blocks[0].hash);
            state.last_hash = blocks[0].hash;
            blocks.forEach(function(block){
              redis.set(block.hash, JSON.stringify(block));
            });
            done(true,"OK");
          })
          .catch(error => {
            console.log('Error while sync',error);
            this.remove_neighbour(state.neighbours[0].id,()=>{});
            done(false,"UNKNOWN");
          });

    }else {
      done(false,"NO_NEIGHBOURS");
    }
  },

  get_ballances: function(){
    return ballances.data;
  },
  get_pending_transactions:function(){
    return state.tx;
  },
  add_neighbour:function(link,done){
    state.neighbours.push({id:link.id,url:link.url});
    redis.set('neighbours',JSON.stringify(state.neighbours));
    done(true,"OK");
  },
  get_neighbours: function(){
    return state.neighbours;
  },
  remove_neighbour:function(id,done){
    const index = state.neighbours.findIndex(link=>link.id==id);

    if(index >= 0){
      state.neighbours.splice(index,1);
      redis.set('neighbours',JSON.stringify(state.neighbours));
      done(true,"OK");
    }
    else{
      done(false,"WRONG_ID");
    }
  },

  // helper private functions
  _propagate_block: function(block, links, exclude_link_id){
    links.forEach((link) =>{
      if(link.id != exclude_link_id){

        axios.post(link.url+"/blockchain/receive_update", {
          sender_id: state.id,
          block: block
        })
        .then((response) => {
          if(!response.data.success){
            console.log('success',response.data);
          }
          else{
            console.log('propagate_block response ',response.data);
          }
        })
        .catch( (error) => {
          console.log('error while propagating block',error);
          this.remove_neighbour(link.id, ()=>{});
        });
      }
    });
  },
  _send_block: function(state,redis,done){
    let block = {};
    block.ts = Date.now();
    block.prev_hash = state.last_hash;
    block.tx = state.tx;
    const data = block.tx.map(tx => tx.from+tx.to+tx.amount).join('')+block.ts.toString() + block.prev_hash.toString();
    const hash = sha256(data);
    block.hash = hash;


    redis.set(hash,JSON.stringify(block),(err,res) => {
      if(err) console.log('redis error setting block',err);
      state.last_hash = hash;
      state.tx = [];
      redis.set('last_hash',hash);
      this._propagate_block(block,state.neighbours,undefined);
      done(true,"OK");
    });
  }


}
