/**
 *  Implements the CacheWriter interface specified by
 *  RelayTypes, uses an instance of CacheRecordStore
 *  to manage the CacheRecord instances
 *  @flow
 */
import { AsyncStorage } from 'react-native';
import CacheRecordStore from './CacheRecordStore';
import type { CacheRecord } from './CacheRecordStore';

const DEFAULT_CACHE_KEY: string = '__RelayCacheManager__';
const DEFAULT_TIMEOUT: number = 10 * 1000; 

type CacheWriterOptions = {
    cacheKey ? : string,
    timeout ? : number
}

export default class CacheWriter {
    cache: CacheRecordStore = new CacheRecordStore();
    cacheKey: string;
    constructor(options: CacheWriterOptions = {}) {
        this.cacheKey = options.cacheKey || DEFAULT_CACHE_KEY;
        this.timeout = options.timeout || DEFAULT_TIMEOUT;
        AsyncStorage.getItem(this.cacheKey)
            .then((localCache) => {
                try {
                    if (localCache) {
                        localCache = JSON.parse(localCache);
                        this.cache = CacheRecordStore.fromJSON(localCache);
                    } else {
                        this.cache = new CacheRecordStore();
                    }
                } catch (err) {
                    this.cache = new CacheRecordStore();
                }
            })
            .catch(error => {
                console.log(error);
            });

        setInterval(() => {
            var cache = [];
            const serialized = JSON.stringify(this.cache, function(key, value) {
                if (typeof value === 'object' && value !== null) {
                    if (cache.indexOf(value) !== -1) {
                        return;
                    }
                    cache.push(value);
                }
                return value;
            });
            cache = null;
            AsyncStorage.setItem(this.cacheKey, serialized)
                .catch(error => {
                    console.log(error);
                });
        }, this.timeout);
    }

    clearStorage() {
        localStorage.removeItem(this.cacheKey);
        this.cache = new CacheRecordStore();
    }

    writeField(
        dataId: string,
        field: string,
        value: ? mixed,
        typeName : ? string
    ) {
        let record = this.cache.records[dataId];
        if (!record) {
            record = {
                __dataID__: dataId,
                __typename: typeName,
            };
        }
        record[field] = value;
        this.cache.records[dataId] = record;
    }


    writeNode(dataId: string, record: CacheRecord) {
        this.cache.writeRecord(dataId, record);
    }

    readNode(dataId: string) {
        const record = this.cache.readNode(dataId)
        return record;
    }

    writeRootCall(
        storageKey: string,
        identifyingArgValue: string,
        dataId: string
    ) {
        this.cache.rootCallMap[storageKey] = dataId;
    }

    readRootCall(
        callName: string,
        callValue: string,
        callback: (error: any, value: any) => void
    ) {
        const dataId = this.cache.rootCallMap[callName];
        setImmediate(callback.bind(null, null, dataId));
    }
}
