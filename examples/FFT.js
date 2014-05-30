var MAX_UINT8 = 255;

/**
 * Convert to Web Audio Component FFT-visualizer after 
 * switching to browserify modules
 */

function FFT (ctx, options) {
  var module = this;
  this.canvas = options.canvas;
  this.onBeat = options.onBeat;
  this.offBeat = options.offBeat;
  this.type = options.type || 'frequency';
  this.spacing = options.spacing || 1;
  this.width = options.width || 1;
  this.count = options.count || 512;
  this.input = this.output = ctx.createAnalyser();
  this.proc = ctx.createScriptProcessor(256, 1, 1);
  this.data = new Uint8Array(this.input.frequencyBinCount);
  this.ctx = this.canvas.getContext('2d');

  this.decay = options.decay || 0.002;
  this.threshold = options.threshold || 0.5;
  this.range = options.range || [0, this.data.length-1];
  this.wait = options.wait || 512;

  this.h = this.canvas.height;
  this.w = this.canvas.width;

  this.input.connect(this.proc);
  this.proc.onaudioprocess = process.bind(null, module);
  this.ctx.lineWidth = module.width;
}

FFT.prototype.connect = function (node) {
  this.output.connect(node);
  this.proc.connect(node);
}

function process (module) {
  
  var ctx = module.ctx;
  var data = module.data;
  ctx.clearRect(0, 0, module.w, module.h);
  ctx.fillStyle = module.fillStyle || '#000000';
  ctx.strokeStyle = module.strokeStyle || '#000000';

  if (module.type === 'frequency') {
    module.input.getByteFrequencyData(data);
    // Abort if no data coming through, quick hack, needs fixed
    if (module.data[3] < 5) return;

    for (var i= 0, l = data.length; i < l && i < module.count; i++) {
      ctx.fillRect(
        i * (module.spacing + module.width),
        module.h,
        module.width,
        -(module.h / MAX_UINT8) * data[i]
      );
    }
  }
  else if (module.type === 'time') {
    module.input.getByteTimeDomainData(data);
    // Abort if no data coming through, quick hack, needs fixed
    if (module.data[3] < 5) return;
    ctx.beginPath();
    ctx.moveTo(0, module.h / 2);
    for (var i= 0, l = data.length; i < l && i < module.count; i++) {
      ctx.lineTo(
        i * (module.spacing + module.width),
        (module.h / MAX_UINT8) * data[i]
      );
    }
    ctx.stroke();
    ctx.closePath();
  }
 
  if (!module.onBeat) return;
 
  var min = module.range[0];
  var max = module.range[1];
  var threshold = module.threshold;
  var decay = module.decay;
  var wait = module.wait;
  var currentWait = module.currentWait || wait;
  var current = reduceMagnitude(data, min, max, function (total, mag) {
    return mag + total;
  }, 0);

  if (current > threshold) {
    module.onBeat(current);
    module.threshold = current;
    module.currentWait = wait;
  } else {
    module.threshold -= decay;
    module.currentWait -= 1;
    if (module.offBeat) module.offBeat(current);
  }
}

function reduceMagnitude (array, min, max, reducer, init) {
  var aggregate = init;
  for (var i = min; i < max + 1; i++)
    aggregate = reducer(aggregate, array[i]);
  return aggregate / MAX_UINT8 / (max - min + 1);
}
