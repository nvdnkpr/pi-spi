var fs = require('fs'),
    _spi = require("./build/Release/spi_binding");

exports.initialize = function (dev) {
    
    var spi = {},
        _fd = null, _fd_err = null,
        _speed = 4e6,
        _mode = 0,
        _order = 0;
    
    // WORKAROUND: this simplifies compatibility with [REDACTED]'s sync initialize
    // TODO: provide a saner alternative for Raspi-only users who want timely errors, etc.
    var _transfer_queue = [];
    function _enqueue_transfer(w,r,cb) {
        _transfer_queue.push([null, _speed, _mode, _order, w, r, cb]);
        _nudge_queue();
    }
    function _nudge_queue() {
        if (_fd_err) {
            _transfer_queue.forEach(function (xfr) {
                xfr.pop()(_fd_err);
            });
            _transfer_queue.length = 0;
        }
        if (!_fd) return;
        if (!_transfer_queue.length) return;
        if (_transfer_queue.processing) return;
        
        _transfer_queue.processing = true;
        var xfr = _transfer_queue.shift(),
            cb = xfr.pop();         // replace cb with wrapped version
        xfr.push(function (e,d) {
            delete _transfer_queue.processing;
            _nudge_queue();
            cb(e,d);
        });
        xfr[0] = _fd;
        _spi.transfer.apply(null, xfr);   
    }
    
    fs.open(dev, 'r+', function (e, fd) {
        if (e) _fd_err = e;
        else _fd = fd;
        _nudge_queue();
    });
    
    spi.clockSpeed = function (speed) {
        if (arguments.length < 1) return _speed;
        else _speed = speed;
    };
    spi.dataMode = function (mode) {
        if (arguments.length < 1) return _mode;
        else _mode = mode;
    };
    spi.bitOrder = function (order) {
        if (arguments.length < 1) return _order;
        else _order = order;
    };
    
    function _configureIfDirty() {
        if (!_dirty) return;
        // TODO: the dirty work
    }
    
    spi.write = function (writebuf, cb) {
        _enqueue_transfer(writebuf, 0, cb);
    };
    spi.read = function (readcount, cb) {
        _enqueue_transfer(null, readcount, cb);
    };
    spi.transfer = function (writebuf, readcount, cb) {
        _enqueue_transfer(writebuf, readcount, cb);
    };
    
    return spi;
}