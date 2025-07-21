// Originally from @xmpp/debug/index.js. Modified by coopeeo
// Original project license: ISC
"use strict";

/* eslint no-console: 0 */

const stringify = require("ltx/lib/stringify.js");
const clone = require("ltx/lib/clone.js");
const { hideSensitive } = require("@xmpp/debug");

const logger = require("./logger.js");

function format(element) {
  return stringify(hideSensitive(clone(element)), 2);
}

module.exports = function debug(entity, force) {
  if ((process.env.XMPP_DEBUG && process.env.XMPP_DEBUG.toLowerCase() === 'true') || force === true) {
    entity.on("element", (data) => {
      logger.debug(`[XMPP] IN\n${format(data)}`);
    });

    entity.on("send", (data) => {
      logger.debug(`[XMPP] OUT\n${format(data)}`);
    });

    entity.on("error", (error) => {
      logger.error("[XMPP], error");
    });

    entity.on("status", (status, value) => {
      logger.debug("[XMPP]", status, value ? value.toString() : "");
    });
  }
};

module.exports.hideSensitive = hideSensitive;
