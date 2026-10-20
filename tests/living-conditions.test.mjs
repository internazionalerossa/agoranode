import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import CASES from '../app/data/living-conditions.json' with {type:'json'};
import {historyId} from '../app/lib/history-navigation.ts';
import EVIDENCE from '../app/data/editorial-source-evidence.json' with {type:'json'};
import {SOURCE_CATALOG} from '../app/data/catalog.ts';
import {VIDEO_CHANNELS} from '../app/data/video-catalog.ts';
test('living outcomes point to real dossiers, preserve measure definitions and match stored annual observations',async()=>{
 for(const item of CASES){assert.ok(historyId(item.dossier));assert.ok(item.meaning&&item.context&&item.limit&&item.sources.length);}
 const mortality=JSON.parse(await readFile(new URL('../public/data/history/SP.DYN.IMRT.IN.json',import.meta.url)));
 assert.equal(new Map(mortality.series.CHN).get(1978),54.1);assert.equal(new Map(mortality.series.CHN).get(2024),4.1);assert.equal(new Map(mortality.series.USA).get(2024),5.5);
 const poverty=JSON.parse(await readFile(new URL('../public/data/history/SI.POV.DDAY.json',import.meta.url)));
 assert.equal(new Map(poverty.series.VNM).get(1992),57.5);assert.equal(new Map(poverty.series.VNM).get(2022),1.6);
});
test('every new news source has a checked feed and each official video channel has a matching documented channel identity',()=>{
 for(const item of EVIDENCE.sources){const source=SOURCE_CATALOG.find(source=>source.id===item.id);assert.ok(source?.feedUrls?.length,item.id);assert.ok(item.feedChecked&&new URL(item.evidence).protocol==='https:');}
 for(const item of EVIDENCE.videos){const channel=VIDEO_CHANNELS.find(channel=>channel.id===item.id);assert.equal(channel?.channelId,item.channelId);assert.ok(new URL(item.officialReference).protocol==='https:');}
});
