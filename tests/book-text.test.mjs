import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readerText, parseReaderPage, readerChapters, paginateBook, sectionReaderBook, decodeBookHtml } from "../app/lib/book-text.ts";
import { readerDestination } from "../app/lib/book-navigation.ts";

test("reader navigation crosses chapter boundaries in both directions without skipping preceding pages",()=>{
 assert.deepEqual(readerDestination(1,0,4,3,-1),{chapter:0,page:-1});
 assert.deepEqual(readerDestination(1,3,4,3,1),{chapter:2,page:0});
 assert.deepEqual(readerDestination(1,2,4,3,-1),{chapter:1,page:1});
 assert.equal(readerDestination(0,0,4,3,-1),null);
 assert.equal(readerDestination(2,3,4,3,1),null);
});

test("book text decodes complete HTML entities in Italian and other editions without activating encoded markup",()=>{
 const blocks=parseReaderPage('<h1>Prefazione all&rsquo;edizione tedesca</h1><p>La Lega incaric&ograve; i sottoscritti. Cos&igrave; nacque il Manifesto, che part&igrave; per Londra. &Egrave; gi&agrave; qui.</p>');
 assert.equal(blocks[1].text,'La Lega incaricò i sottoscritti. Così nacque il Manifesto, che partì per Londra. È già qui.');
 assert.equal(readerText('&OElig;uvre &Auml;nderung &Scaron; &lstrok; &Alpha; &NotEqualTilde; &frac12;'),'Œuvre Änderung Š ł Α ≂̸ ½');
 assert.equal(readerText('&#242; &#x1F91D; &#0; &#xD800;'),'ò 🤝 � �');
 assert.equal(readerText('&lt;img src=x onerror=alert(1)&gt; &amp;ograve; &unknown;'),'<img src=x onerror=alert(1)> &ograve; &unknown;');
 assert.equal(readerText('&constructor; &toString;'),'&constructor; &toString;');
 const toc=readerChapters('<a href="one.htm">Cooperazione &amp; libert&agrave;</a>','https://www.marxists.org/test/index.htm');
 assert.equal(toc[0].title,'Cooperazione & libertà');
});

test("reader text is inert, paginated without omissions and its chapter list cannot escape the selected edition",()=>{
 const blocks=parseReaderPage('<!DOCTYPE html><html><head><title>Hidden</title></head><nav>Navigation</nav><script>alert(1)</script><h1>Cooperare</h1><p>Un <em>mondo</em> &amp; una comunità.</p><p>&lt;script&gt;inert&lt;/script&gt;</p><footer>Footer</footer></html>');
 assert.deepEqual(blocks,[{type:"h2",text:"Cooperare"},{type:"p",text:"Un mondo & una comunità."},{type:"p",text:"<script>inert</script>"}]);
 const pages=paginateBook([{type:"p",text:"parola ".repeat(2000).trim()}],3200);
 assert.ok(pages.length>3);assert.equal(pages.flat().map(b=>b.text).join(" "),"parola ".repeat(2000).trim());
 const chapters=readerChapters('<title>Book</title><a href="one.htm">Uno</a><a href="two.htm">Due</a><a href="../outside.htm">No</a><a href="https://127.0.0.1/a.htm">No</a><a href="one.htm#note">Duplicato</a>','https://www.marxists.org/test/book/index.htm');
 assert.deepEqual(chapters.map(c=>c.title),["Uno","Due"]);
 const toc=readerChapters('<title>Sommaire</title><a href="part-a.htm">I</a><a href="part-b.htm">II</a><a href="part-c.htm">III</a>','https://www.marxists.org/test/book/written-toc-name.htm');
 assert.equal(toc.length,3);
 const full=[{type:"p",text:"Preambolo"},...["Uno","Due","Tre"].flatMap(text=>[{type:"h2",text},{type:"p",text:"Un paragrafo completo. ".repeat(400)}])];
 assert.deepEqual(sectionReaderBook(full).flat(),full);assert.equal(sectionReaderBook(full).length,4);
});

