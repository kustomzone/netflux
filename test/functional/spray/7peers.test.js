import {signaling} from 'config'
import WebChannel from 'src/WebChannel'
import {SPRAY} from 'serviceProvider'

xdescribe('[SPRAY] 7 peers -> ', () => {
  let wc1, wc2, wc3, wc4, wc5, wc6, wc7

  it('A peer is leaving', (done) => {
    let msg1 = 'And I am #1'
    let msg2 = 'Hi, I am #2'
    let msg3 = 'Hello, here is #3'
    
    wc1 = new WebChannel({signaling, topology: SPRAY})
    wc1.onMessage = (id, msg) => {}

    wc2 = new WebChannel({signaling, topology: SPRAY})
    wc2.onMessage = (id, msg) => {}

    wc3 = new WebChannel({signaling, topology: SPRAY})
    wc3.onMessage = (id, msg) => {}

    wc4 = new WebChannel({signaling, topology: SPRAY})
    wc4.onMessage = (id, msg) => {}

    wc5 = new WebChannel({signaling, topology: SPRAY})
    wc5.onMessage = (id, msg) => {}

    wc6 = new WebChannel({signaling, topology: SPRAY})
    wc6.onMessage = (id, msg) => {}

    wc7 = new WebChannel({signaling, topology: SPRAY})
    wc7.onMessage = (id, msg) => {}

    wc1.open().then((data) => {
      console.log(' 1)')

      wc2.join(data.key).then(() => {
        console.log(' 2)')
        wc2.manager.shuffle(wc2)

        setTimeout(() => {
          wc3.join(data.key).then(() => {
            console.log(' 3)')

            wc4.join(data.key).then(() => {
              console.log(' 4)')

              wc5.join(data.key).then(() => {
                console.log(' 5)')

                wc2.manager.shuffle(wc2)

                setTimeout(() => {
                  wc6.join(data.key).then(() => {
                    console.log(' 6)')

                    wc7.join(data.key).then(() => {
                      console.log(' 7)')
                      console.log(wc1.myId, wc2.myId, wc3.myId, wc4.myId, wc5.myId, wc6.myId, wc7.myId)
                      console.log(' shuffle 2')
                      wc2.manager.shuffle(wc2)
                      setTimeout(() => {
                        console.log(wc3.myId, wc3.knownPeers, wc3.channels)
                        console.log(' shuffle 3')
                        wc3.manager.shuffle(wc3)
                        setTimeout(() => {
                          console.log(' shuffle 6')
                          wc6.manager.shuffle(wc6)
                          setTimeout(() => {
                            console.log(' shuffle 1')
                            wc1.manager.shuffle(wc1)
                            setTimeout(() => {
                              console.log(' shuffle 4')
                              wc4.manager.shuffle(wc4)
                              setTimeout(() => {
                                console.log(' shuffle 7')
                                wc7.manager.shuffle(wc7)
                                setTimeout(() => {
                                  console.log(' shuffle 5')
                                  wc5.manager.shuffle(wc5)
                                  setTimeout(() => {
                                    console.log(' shuffle 2')
                                    wc2.manager.shuffle(wc2)
                                    setTimeout(() => {
                                      console.log('wc1', wc1.knownPeers)
                                      console.log('wc2', wc2.knownPeers)
                                      console.log('wc3', wc3.knownPeers)
                                      console.log('wc4', wc4.knownPeers)
                                      console.log('wc5', wc5.knownPeers)
                                      console.log('wc6', wc6.knownPeers)
                                      console.log('wc7', wc7.knownPeers)
                                    }, 1500)
                                  }, 1500)
                                }, 1500)
                              }, 1500)
                            }, 1500)
                          }, 1500)
                        }, 1500)
                      }, 1500)
                    })
                  })
                }, 1500)
              })
            })
          }).catch(done.fail)
        }, 500)
      }).catch(done.fail)
    }).catch(done.fail)
  }, 20000)
})
