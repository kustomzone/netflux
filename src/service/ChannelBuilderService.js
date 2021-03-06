import { Service } from 'service/Service'
import { ServiceFactory, WEB_RTC, WEB_SOCKET } from 'ServiceFactory'
import { WebSocketChecker } from 'service/WebSocketService'
import { WebRTCChecker } from 'service/WebRTCService'
import * as log from 'log'

const ListenFlags = {
  none: 0b00, // 0
  ws: 0b01,   // 1
  wrtc: 0b10, // 2
  all: 0b11   // 4
}

let iListenOn = ListenFlags.none

/**
 * It is responsible to build a channel between two peers with a help of `WebSocketService` and `WebRTCService`.
 * Its algorithm determine which channel (socket or dataChannel) should be created
 * based on the services availability and peers' preferences.
 */
export class ChannelBuilderService extends Service {
  constructor (id) {
    super(id)

    // Check whether the peer is listening on WebSocket
    WebSocketChecker.isListening()
      .subscribe((value) => {
        iListenOn = value ? iListenOn | ListenFlags.ws : iListenOn & ~ListenFlags.ws
      })

    // Check whether the peer supports WebRTC
    if (WebRTCChecker.isSupported) {
      iListenOn |= ListenFlags.wrtc
    }
  }

  init (webChannel) {
    super.init(webChannel)

    // Listen on RTCDataChannel
    if (iListenOn & ListenFlags.wrtc) {
      ServiceFactory.get(WEB_RTC)
        .onChannelFromWebChannel(webChannel, {iceServers: webChannel.settings.iceServers})
        .subscribe(dc => this.onChannel(webChannel, dc, Number(dc.label)))
    }

    // Listen on WebSocket
    if (iListenOn & ListenFlags.ws) {
      ServiceFactory.get(WEB_SOCKET)
        .onWebSocket()
        .filter(({wc}) => wc.id === webChannel.id)
        .subscribe(({wc, ws, senderId}) => this.onChannel(wc, ws, senderId))
    }

    // Subscribe to WebChannel internal message stream for this service
    super.addSubscription(
      webChannel,
      webChannel._msgStream
        .filter(msg => msg.serviceId === this.id)
        .subscribe(
          msg => this.handleSvcMsg(msg.channel, msg.senderId, msg.recepientId, msg.content)
        )
    )
  }

  /**
   * Establish a channel with the peer identified by `id`.
   *
   * @param {WebChannel} wc
   * @param {number} id
   *
   * @returns {Promise<Channel, string>}
   */
  connectTo (wc, id) {
    log.info('ChannelBuilderService connecTo', {wc: wc.id, ME: wc.myId, TO: id, iListenOn})
    return new Promise((resolve, reject) => {
      super.setPendingRequest(wc, id, {resolve, reject})
      wc._sendInnerTo(id, this.id, {connectors: iListenOn, url: WebSocketChecker.url})
    })
  }

  /**
   * @param {WebChannel} wc
   * @param {WebSocket|RTCDataChannel} channel
   * @param {number} senderId
   */
  onChannel (wc, channel, senderId) {
    wc._initChannel(channel, senderId)
      .then(channel => {
        const pendReq = super.getPendingRequest(wc, senderId)
        if (pendReq) {
          pendReq.resolve(channel)
        }
      })
  }

  /**
   * @param {Channel} channel
   * @param {number} senderId
   * @param {number} recepientId
   * @param {Object} msg
   */
  handleSvcMsg (channel, senderId, recepientId, msg) {
    const wc = channel.webChannel
    log.info('ChannelBuilderService handleSvcMsg', {wc: wc.id, ME: wc.myId, FROM: senderId, VIA: channel.peerId, msg})
    if ('failedReason' in msg) {
      super.getPendingRequest(wc, senderId).reject(new Error(msg.failedReason))
    } else if ('shouldConnect' in msg) {
      if (msg.shouldConnect & ListenFlags.ws) {
        ServiceFactory.get(WEB_SOCKET)
          .connect(`${msg.url}/internalChannel?wcId=${wc.id}&senderId=${wc.myId}`)
          .then(ws => this.onChannel(wc, ws, senderId))
          .catch(reason => {
            super.getPendingRequest(wc, senderId)
              .reject(new Error(`Failed to establish a socket: ${reason}`))
          })
      }
    } else if ('connectors' in msg) {
      // If remote peer is listening on WebSocket, connect to him
      if (msg.connectors & ListenFlags.ws) {
        ServiceFactory.get(WEB_SOCKET)
          .connect(`${msg.url}/internalChannel?wcId=${wc.id}&senderId=${wc.myId}`)
          .then(ws => this.onChannel(wc, ws, senderId))
          .catch(reason => {
            // If failed to connect to the remote peer by WebSocket, ask him to connect to me via WebSocket
            if (iListenOn & ListenFlags.ws) {
              wc._sendInnerTo(senderId, this.id, {shouldConnect: ListenFlags.ws, url: WebSocketChecker.url})
            } else {
              wc._sendInnerTo(senderId, this.id, {
                failedReason: `Failed to establish a socket: ${reason}`
              })
            }
          })

      // If remote peer is able to connect over RTCDataChannel, verify first if I am listening on WebSocket
      } else if (msg.connectors & ListenFlags.wrtc) {
        if (iListenOn & ListenFlags.ws) {
          wc._sendInnerTo(senderId, this.id, {shouldConnect: ListenFlags.ws, url: WebSocketChecker.url})
        } else if (iListenOn & ListenFlags.wrtc) {
          ServiceFactory.get(WEB_RTC)
            .connectOverWebChannel(wc, senderId, {iceServers: wc.settings.iceServers})
            .then(channel => this.onChannel(wc, channel, senderId))
            .catch(reason => {
              wc._sendInnerTo(senderId, this.id, {failedReason: `Failed establish a data channel: ${reason}`})
            })
        } else {
          wc._sendInnerTo(senderId, this.id, {failedReason: 'No common connectors'})
        }
      // If peer is not listening on WebSocket and is not able to connect over RTCDataChannel
      } else if (msg.connectors & ListenFlags.none) {
        if (iListenOn & ListenFlags.ws) {
          wc._sendInnerTo(senderId, this.id, {shouldConnect: ListenFlags.ws, url: WebSocketChecker.url})
        } else {
          wc._sendInnerTo(senderId, this.id, {failedReason: 'No common connectors'})
        }
      }
    }
  }
}
