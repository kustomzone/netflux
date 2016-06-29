import FullyConnectedService from './service/webChannelManager/FullyConnectedService'
import WebRTCService from './service/channelBuilder/WebRTCService'
import WebSocketService from './service/channelBuilder/WebSocketService'
import ChannelBuilderService from './service/channelBuilder/ChannelBuilderService'
import {MessageBuilderService} from './service/MessageBuilderService'
/**
 * Service Provider module is a helper module for {@link module:service}. It is
 * responsible to instantiate all services. This module must be used to get
 * any service instance.
 * @module serviceProvider
 */

/**
 * Constant used to get an instance of {@link WebRTCService}.
 * @type {string}
 */
const WEBRTC = 'WebRTCService'

/**
 * Constant used to get an instance of {@link WebSocketService}.
 * @type {string}
 */
const WEBSOCKET = 'WebSocketService'

const CHANNEL_BUILDER = 'ChannelBuilderService'

/**
 * Constant used to get an instance of {@link FullyConnectedService}.
 * @type {string}
 */
const FULLY_CONNECTED = 'FullyConnectedService'

const MESSAGE_BUILDER = 'MessageBuilderService'

const services = new Map()

/**
 * Provides the service instance specified by `name`.
 *
 * @param  {(module:serviceProvider.CHANNEL_PROXY|
 *          module:serviceProvider.WEBRTC|
            module:serviceProvider.WEBSOCKET|
 *          module:serviceProvider.FULLY_CONNECTED)} name - The service name.
 * @param  {Object} [options] - Any options that the service accepts.
 * @return {module:service~Interface} - Service instance.
 */
let provide = function (name, options = {}) {
  if (services.has(name)) {
    return services.get(name)
  }
  let service
  switch (name) {
    case WEBRTC:
      return new WebRTCService(options)
    case WEBSOCKET:
      return new WebSocketService(options)
    case CHANNEL_BUILDER:
      return new ChannelBuilderService(options)
    case FULLY_CONNECTED:
      service = new FullyConnectedService()
      services.set(name, service)
      return service
    case MESSAGE_BUILDER:
      service = new MessageBuilderService()
      services.set(name, service)
      return service
    default:
      return null
  }
}

export {WEBRTC, WEBSOCKET, CHANNEL_BUILDER, FULLY_CONNECTED, MESSAGE_BUILDER, provide}
