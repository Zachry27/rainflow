const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

// Paths
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const SETTINGS_FILE = path.join(__dirname, 'settings.json');

// Auto-detect ffmpeg: prefer system PATH, fallback to parent folder
const which = (cmd) => {
  try {
    const result = require('child_process').execSync(`where ${cmd}`, { stdio: ['pipe','pipe','ignore'] });
    return result.toString().trim().split('\n')[0].trim();
  } catch(e) { return null; }
};

const FFMPEG_PATH  = which('ffmpeg')  || path.join(__dirname, '..', 'ffmpeg.exe');
const FFPROBE_PATH = which('ffprobe') || path.join(__dirname, '..', 'ffprobe.exe');

// Create uploads dir if not exists
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname.replace(/\s+/g, '_'))
});
const upload = multer({ storage });

// Default Settings
let settings = {
  parallelLimit: 5,
  loopMode: 'alpha_fade',
  deflicker: false,
  deshake: false,
  enableAudio: false,
  outputType: 'count',
  outputCount: 6,
  outputDuration: 60,
  fadeDuration: 1.0
};

if (fs.existsSync(SETTINGS_FILE)) {
  try { settings = { ...settings, ...JSON.parse(fs.readFileSync(SETTINGS_FILE)) }; } catch(e) {}
}

const saveSettings = () => fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));

// Queue
const queue = [];
let activeJobs = 0;

const processQueue = () => {
  if (queue.length === 0 || activeJobs >= settings.parallelLimit) return;
  const job = queue.shift();
  activeJobs++;
  runFfmpegJob(job).finally(() => { activeJobs--; processQueue(); });
};

const getDuration = (filePath) => new Promise((resolve) => {
  const p = spawn(FFPROBE_PATH, ['-v','quiet','-show_entries','format=duration','-of','csv=p=0', filePath]);
  let out = '';
  p.stdout.on('data', d => out += d);
  p.on('close', () => resolve(parseFloat(out.trim()) || 0));
});

const emit = (id, imageId, payload) => io.emit('job_status', { id, imageId, ...payload });

const runFfmpegJob = async (job) => {
  const { id, imageId, videoFile, audioFile, opts } = job;
  emit(id, imageId, { status: 'processing', progress: 0, log: 'Mulai memproses video...' });

  try {
    const videoDuration = await getDuration(videoFile.path);
    if (!videoDuration) throw new Error('Gagal membaca durasi video.');

    const outName = `loop_${Date.now()}_${videoFile.originalname}`;
    const outPath = path.join(UPLOADS_DIR, outName);

    const preFilters = [];
    if (opts.deshake === true   || opts.deshake   === 'true') preFilters.push('deshake');
    if (opts.deflicker === true || opts.deflicker === 'true') preFilters.push('deflicker=mode=pm');
    const baseFilter = preFilters.join(',');

    let filterComplex;
    if (opts.loopMode === 'alpha_fade') {
      const fd = parseFloat(opts.fadeDuration) || 1.0;
      const vd = videoDuration;
      const trimStart = `trim=start=0:duration=${fd},format=yuva420p,fade=d=${fd}:alpha=1,setpts=PTS-STARTPTS+(${vd - 2 * fd})/TB`;
      const trimEnd   = `trim=start=${fd}:end=${vd},setpts=PTS-STARTPTS`;
      filterComplex = baseFilter
        ? `[0:v]${baseFilter},split[body][pre];[pre]${trimStart}[jt];[body]${trimEnd}[main];[main][jt]overlay=eof_action=pass[outv]`
        : `[0:v]split[body][pre];[pre]${trimStart}[jt];[body]${trimEnd}[main];[main][jt]overlay=eof_action=pass[outv]`;
    } else {
      filterComplex = baseFilter ? `[0:v]${baseFilter}[outv]` : null;
    }

    // Step 1: seamless 1-loop
    emit(id, imageId, { log: '[1/2] Membuat transisi seamless...' });
    const tempOut = path.join(UPLOADS_DIR, `temp_${id}.mp4`);
    const step1Args = ['-y', '-i', videoFile.path];
    if (filterComplex) step1Args.push('-filter_complex', filterComplex, '-map', '[outv]');
    else step1Args.push('-map', '0:v');
    step1Args.push('-c:v','libx264','-preset','medium','-crf','18','-an', tempOut);
    await runSpawn(FFMPEG_PATH, step1Args, id, imageId);

    // Step 2: concat + audio
    emit(id, imageId, { log: '[2/2] Menggabungkan & merge audio...' });
    const finalArgs = ['-y'];
    const count    = parseInt(opts.outputCount)    || 6;
    const duration = parseFloat(opts.outputDuration) || 60;

    if (opts.outputType === 'count') finalArgs.push('-stream_loop', String(count - 1), '-i', tempOut);
    else finalArgs.push('-stream_loop', '-1', '-i', tempOut);

    const hasAudio = (opts.enableAudio === true || opts.enableAudio === 'true') && audioFile;
    if (hasAudio) finalArgs.push('-stream_loop', '-1', '-i', audioFile.path);

    finalArgs.push('-c:v', 'copy');
    if (hasAudio) finalArgs.push('-c:a','aac','-b:a','192k','-map','0:v:0','-map','1:a:0');
    if (opts.outputType === 'duration') finalArgs.push('-t', String(duration));
    finalArgs.push('-shortest', outPath);

    await runSpawn(FFMPEG_PATH, finalArgs, id, imageId);
    try { fs.unlinkSync(tempOut); } catch(e) {}

    emit(id, imageId, { status:'completed', progress:100, resultUrl:`/downloads/${outName}`, log:`Selesai: ${outName}` });

  } catch(err) {
    console.error('[JOB ERROR]', err);
    emit(id, imageId, { status:'error', log:`Error: ${err.message}` });
  }
};

const runSpawn = (cmd, args, jobId, imageId) => new Promise((resolve, reject) => {
  const proc = spawn(cmd, args);
  proc.stderr.on('data', d => {
    const s = d.toString();
    if (s.includes('time=')) emit(jobId, imageId, { log: s.trim() });
  });
  proc.on('close', code => code === 0 ? resolve() : reject(new Error(`FFmpeg exit code ${code}`)));
});

// API
app.get('/api/settings', (req, res) => res.json(settings));
app.post('/api/settings', (req, res) => { settings = {...settings, ...req.body}; saveSettings(); res.json({success:true}); });

app.post('/api/process', upload.fields([{name:'video'},{name:'audio'}]), (req, res) => {
  const videoFile = req.files?.video?.[0];
  const audioFile = req.files?.audio?.[0];
  if (!videoFile) return res.status(400).json({error:'Video file required'});

  const jobId   = Date.now().toString();
  const imageId = req.body.imageId || null;
  queue.push({ id:jobId, imageId, videoFile, audioFile, opts:{...settings,...req.body} });
  console.log(`[QUEUE] Job ${jobId} added. Queue: ${queue.length}`);
  processQueue();
  res.json({ jobId, imageId, message:'Added to queue' });
});

app.get('/api/queue', (req, res) => res.json({ queued:queue.length, active:activeJobs, parallelLimit:settings.parallelLimit }));
app.use('/downloads', express.static(UPLOADS_DIR));

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 BenAlus Backend listening on http://0.0.0.0:${PORT}`);
  console.log(`📂 Uploads: ${UPLOADS_DIR}`);
  console.log(`⚙️  FFmpeg: ${FFMPEG_PATH}\n`);
});
