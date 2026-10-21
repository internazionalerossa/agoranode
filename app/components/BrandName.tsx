import {brandColour} from '@/app/lib/brand';
import {INSTANCE_MANIFEST} from '@/app/lib/instance';
/** Do not send the wordmark through automatic translation. */
export default function BrandName({language}:{language:string}){
 return <bdi className="brand-name" dir="ltr" translate="no"><span className="brand-prefix">{INSTANCE_MANIFEST.brand.wordmarkPrefix}</span><span className="brand-suffix" lang={language}>{brandColour(language)}</span></bdi>;
}
