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
      console.log('received :', msg)
      if (id === wc3.myId) {
        expect(msg).toEqual(msg3)
      } else if (id === wc2.myId) {
        expect(msg).toEqual(msg2)
        wc1.send(msg1)
      } else done.fail()
    }
    wc1.open().then((data) => {
      // Peer #2
      wc2 = new WebChannel({signaling})//, topology: SPRAY})
      wc2.onMessage = (id, msg) => {
        console.log('received :', msg)
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
        // Peer #3
        wc3 = new WebChannel({signaling})//, topology: SPRAY})
        wc3.onMessage = (id, msg) => {
          console.log('received :', msg)
          if (id === wc2.myId) {
            expect(msg).toEqual(msg2)
          } else if (id === wc1.myId) {
            expect(msg).toEqual(msg1)
            done()
          } else done.fail()
        }
        wc3.join(data.key)
          .then(() => {
            wc3.send(msg3)

            // console.log('1')
            // wc4 = new WebChannel({signaling})//, topology: SPRAY})
            // wc4.onMessage = () => {}

            // wc4.join(data.key)
            //   .then(() => {
                // console.log('2')
                // wc5 = new WebChannel({signaling, topology: SPRAY})
                // wc5.onMessage = () => {}
                // wc5.join(data.key)
                //   .then(() => {
                //     console.log('3')
                //     wc6 = new WebChannel({signaling, topology: SPRAY})
                //     wc6.onMessage = () => {}
                //     wc6.join(data.key)
                //       .then(() => {
                //         console.log('youhou')
                //       })
                // })
              // })


            // wc3.manager.shuffle(wc3)
          })
          .catch(done.fail)
      }).catch(done.fail)
    }).catch(done.fail)
  })
})
