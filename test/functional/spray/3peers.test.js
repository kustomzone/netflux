import {signaling} from 'config'
import WebChannel from 'src/WebChannel'
import {SPRAY} from 'serviceProvider'

describe('[SPRAY] 3 peers -> ', () => {
  let wc1, wc2, wc3

  it('Should exchange messages', (done) => {
    let msg1 = 'And I am #1'
    let msg2 = 'Hi, I am #2'
    let msg3 = 'Hello, here is #3'
    // Peer #1
    wc1 = new WebChannel({signaling, topology: SPRAY})
    wc1.onMessage = (id, msg) => {
      if (id === wc3.myId) {
        expect(msg).toEqual(msg3)
      } else if (id === wc2.myId) {
        expect(msg).toEqual(msg2)
        wc1.send(msg1)
      } else {
        done.fail()
      }
    }
    wc1.open().then((data) => {
      // Peer #2
      wc2 = new WebChannel({signaling, topology: SPRAY})
      wc2.onMessage = (id, msg) => {
        if (id === wc3.myId) {
          expect(msg).toEqual(msg3)
          wc2.send(msg2)
        } else if (id === wc1.myId) {
          expect(msg).toEqual(msg1)
          done()
        } else done.fail()
      }

      wc2.join(data.key).then(() => {
        wc2.manager.shuffle(wc2)
        
        // Peer #3
        setTimeout(() => {
          wc3 = new WebChannel({signaling, topology: SPRAY})
          wc3.onMessage = (id, msg) => {
            if (id === wc2.myId) {
              expect(msg).toEqual(msg2)
            } else if (id === wc1.myId) {
              expect(msg).toEqual(msg1)
              done()
            } else if (id === wc3.myId) {} else {
              done.fail()
            }
          }
          wc3.join(data.key)
            .then(() => {
              wc3.send(msg3)
            })
            .catch(done.fail)
        }, 500)
      }).catch(done.fail)
    }).catch(done.fail)
  }, 8000)
})
