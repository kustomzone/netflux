import {signaling, MSG_NUMBER, randString} from 'config'
import WebChannel from 'src/WebChannel'
import {SPRAY} from 'serviceProvider'

it('Should send/receive STRING messages', (done) => {
  let msg1Array = []
  let msg2Array = []
  let startTime = null
  for (let i = 0; i < MSG_NUMBER; i++) {
    msg1Array[i] = randString()
    msg2Array[i] = randString()
  }
  let counter = msg1Array.length + msg2Array.length

  // Peer #1
  let wc1 = new WebChannel({signaling, topology: SPRAY})
  let wc2 = new WebChannel({signaling, topology: SPRAY})
  wc1.onJoining = (id) => {
    if (startTime == null) startTime = Date.now()
    for (let e of msg1Array) {
      wc1.sendTo(wc2.myId, e)
    }
  }
  wc1.onMessage = (id, msg) => {
    counter--
    expect(msg2Array.indexOf(msg)).toBeGreaterThan(-1)
    if (counter <= 0) {
      console.info((MSG_NUMBER * 2) + ' messages sent between 2 peers in: ' + (Date.now() - startTime) + ' ms')
      done()
    }
  }

  wc1.open().then((data) => {
    // Peer #2
    wc2.onMessage = (id, msg) => {
      counter--
      expect(msg1Array.indexOf(msg)).toBeGreaterThan(-1)
      if (counter <= 0) {
        console.info((MSG_NUMBER * 2) + ' messages sent between 2 peers in: ' + (Date.now() - startTime) + ' ms')
        done()
      }
    }
    wc2.join(data.key)
      .then(() => {
        if (startTime == null) startTime = Date.now()
        for (let e of msg2Array) {
          wc2.sendTo(wc1.myId, e)
        }
      })
      .catch(done.fail)
  }).catch(done.fail)
}, 15000)
