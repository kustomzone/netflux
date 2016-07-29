import {signaling} from 'config'
import {WebChannel} from 'src/WebChannel'
import {FULLY_CONNECTED, SPRAY} from 'serviceProvider'

describe('3 peers -> ', () => {
  let wc1, wc2, wc3, wc4, wc5, wc6

  it('Should exchange messages', (done) => {
    let msg1 = 'And I am #1'
    let msg2 = 'Hi, I am #2'
    let msg3 = 'Hello, here is #3'
    // Peer #1
    wc1 = new WebChannel({signaling})//, topology: SPRAY})
    wc1.onMessage = (id, msg) => {
      console.log('wc1', wc1.myId, id, msg)
      if (id === wc3.myId) {
        expect(msg).toEqual(msg3)
      } else if (id === wc2.myId) {
        expect(msg).toEqual(msg2)
        wc1.send(msg1)
      } else {
        console.log(id, wc1.myId, wc2.myId, wc3.myId)
        done.fail()
      }
    }
    wc1.open().then((data) => {
      // Peer #2
      wc2 = new WebChannel({signaling})//, topology: SPRAY})
      wc2.onMessage = (id, msg) => {
        console.log('wc2', wc2.myId, id, msg)
        if (id === wc3.myId) {
          expect(msg).toEqual(msg3)
          wc2.send(msg2)
        } else if (id === wc1.myId) {
          expect(msg).toEqual(msg1)
          // console.log('wc1:', wc1.channels.knownPeers, wc1.myId)
          // console.log('wc2:', wc2.channels.knownPeers, wc2.myId)
          // console.log('wc3:', wc3.channels.knownPeers, wc3.myId)
          done()
        } else done.fail()
      }

      wc2.join(data.key).then(() => {
        // wc2.manager.shuffle(wc2)
        
        // Peer #3
        setTimeout(() => {
        wc3 = new WebChannel({signaling})//, topology: SPRAY})
        wc3.onMessage = (id, msg) => {
          console.log('wc3', wc3.myId, id, msg)
          if (id === wc2.myId) {
            expect(msg).toEqual(msg2)
          } else if (id === wc1.myId) {
            expect(msg).toEqual(msg1)
            done()
          } else if (id === wc3.myId) {} else {
            done.fail()
          }
        }
        // console.log('\n------- wc3 joining --------')
        // console.log(wc3)
        wc3.join(data.key)
          .then(() => {
            // setTimeout(() => {
            //   wc3.leave()
            //   setTimeout(() => {
            //     wc2.manager.shuffle(wc2)
            //   },500)
            // },500)
            // console.log('wc3.myId:', wc3.myId)

            // wc3.manager.shuffle(wc3)
            wc3.send(msg3)

            // console.log('1')
            // wc4 = new WebChannel({signaling, topology: SPRAY})
            // wc4.onMessage = (id, msg) => {console.log('wc4', wc4.myId, id, msg)}

            // wc4.join(data.key)
            //   .then(() => {
            //     // wc2.manager.updateChannels(wc2)
            //     // setTimeout(() => {
            //     //   console.log('wc1: myId', wc1.myId)
            //     //   console.log('wc2: myId', wc2.myId, wc2.channels)
            //     //   console.log('wc3: myId', wc3.myId)
            //     //   console.log('wc4: myId', wc4.myId)
            //     // }, 500)

            //     // console.log('2')
            //     wc5 = new WebChannel({signaling, topology: SPRAY})
            //     wc5.onMessage = (id, msg) => {console.log('wc5', wc5.myId, id, msg)}
            //     console.log('wc5 joining')
            //     wc5.join(data.key)
            //       .then(() => {
            //         setTimeout(() => {
            //           wc2.manager.shuffle(wc2)
            //           // wc1.manager.updateChannels(wc1)
            //           // wc3.send(msg3)
            //           // wc3.leave()
            //           setTimeout(() => {
            //             // console.log(wc1.myId, wc2.myId, wc3.myId, wc4.myId, wc5.myId)
            //             // console.log(wc1.knownPeers)
            //             // wc3.sendTo(wc4.myId, 'hi there')
            //             // console.log(wc1.broadcastedMsg)
            //             // for (let i = 0 ; i < wc1.broadcastedMsg.length ; i++) {
            //             //   console.log(wc1.broadcastedMsg[i].data.initialHeader)
            //             // }
            //             // console.log(wc2.broadcastedMsg)
            //             // for (let i = 0 ; i < wc2.broadcastedMsg.length ; i++) {
            //             //   console.log(wc1.broadcastedMsg[i].data.initialHeader)
            //             // }
            //             // console.log(wc3.broadcastedMsg)
            //             // for (let i = 0 ; i < wc3.broadcastedMsg.length ; i++) {
            //             //   console.log(wc1.broadcastedMsg[i].data.initialHeader)
            //             // }
            //             // console.log(wc4.broadcastedMsg)
            //             // for (let i = 0 ; i < wc4.broadcastedMsg.length ; i++) {
            //             //   console.log(wc1.broadcastedMsg[i].data.initialHeader)
            //             // }
            //             // console.log(wc5.broadcastedMsg)
            //             // for (let i = 0 ; i < wc5.broadcastedMsg.length ; i++) {
            //             //   console.log(wc1.broadcastedMsg[i].data.initialHeader)
            //             // }

                        
            //             wc5.manager.updateChannels(wc5)
            //             wc4.manager.updateChannels(wc4)
            //             console.log('wc3: myId', wc3.myId, 'knownPeers', wc3.knownPeers)
            //             // wc3.manager.updateChannels(wc3)
            //             console.log('wc3: myId', wc3.myId, 'knownPeers', wc3.knownPeers)
            //             // wc2.manager.updateChannels(wc2)
            //             wc1.manager.updateChannels(wc1)

            //             setTimeout(() => {
            //               console.log('wc1: myId', wc1.myId, 'knownPeers', wc1.knownPeers)
            //               console.log('wc2: myId', wc2.myId, 'knownPeers', wc2.knownPeers)
            //               console.log('wc3: myId', wc3.myId, 'knownPeers', wc3.knownPeers)
            //               console.log('wc4: myId', wc4.myId, 'knownPeers', wc4.knownPeers)
            //               console.log('wc5: myId', wc5.myId, 'knownPeers', wc5.knownPeers)
            //               // console.log('wc1: myId', wc1.myId, 'channels', wc1.channels)
            //               setTimeout(() => {
            //                 console.log('wc2: myId', wc2.myId, 'channels', wc2.channels)
            //                 console.log('wc3: myId', wc3.myId, 'channels', wc3.channels)
            //               }, 800)
                          
            //               // console.log('wc4: myId', wc4.myId, 'channels', wc4.channels)
            //               // console.log('wc5: myId', wc5.myId, 'channels', wc5.channels)
            //             }, 800)
            //           }, 600)
            //         }, 800)

            //     //     console.log('3')
            //     //     wc6 = new WebChannel({signaling, topology: SPRAY})
            //     //     wc6.onMessage = () => {}
            //     //     wc6.join(data.key)
            //     //       .then(() => {
            //     //         console.log('youhou')
            //     //       })
            //       })
            //   // })

              
            //   })
            //   .catch(done.fail)
                
            // wc3.manager.shuffle(wc3)
            // setTimeout(() => {
            //   wc2.manager.shuffle(wc2)
            //   setTimeout(() => {
            //     wc1.manager.shuffle(wc1)
            //     setTimeout(() => {
            //       console.log('wc1:', wc1.myId)
            //       console.log(wc1.channels)
            //       console.log()
            //       console.log('wc2:', wc2.myId)
            //       console.log(wc2.channels)
            //       console.log()
            //       console.log('wc3:', wc3.myId)
            //       console.log(wc3.channels)
            //     }, 500)
            //   }, 500)
            // }, 500)
          })
          .catch(done.fail)
        }, 500)
      }).catch(done.fail)
    }).catch(done.fail)
  }, 8000)
})
