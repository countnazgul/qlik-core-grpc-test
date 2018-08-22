const grpc = require('grpc');
const mongodb = require('mongodb');
const { MongoToGrpcTransformer } = require('./mongo-to-grpc-transformer');
const streamify = require('stream-array')
// const os = require('os');
const rp = require('request-promise');



class MongoClient {
  async query(call) {
    const url = this._connectionInfoToMongoUrl(call.request.connection);
    try {
      const parameters = JSON.parse(call.request.parameters.statement);
      const transformer = new MongoToGrpcTransformer(call);
      transformer.pipe(call);
      var options = {
        uri: 'http://openlibrary.org/search.json?author=tolkien',
        json: true
      };

      let resp = await rp(options)
      let titles = resp.docs.map(function (d) {
        return { title: d.title_suggest }
      })

      console.log(titles[0])
      streamify(titles).pipe(transformer);


      // mongodb.MongoClient.connect(url, { useNewUrlParser: true }, (err, client) => {
      //   if (err) {
      //     call.emit('error', this._grpcStatusError(err.message));
      //     call.end();
      //   } else {
      //     try {
      //       const collection = client.db().collection(parameters.collection);
      //       const cursor = collection.find(parameters.find || {});
      //       const transformer = new MongoToGrpcTransformer(call);
      //       transformer.pipe(call);
      //       // console.log(cursor)
      //       // cursor.pipe(transformer);

      //       let data = [
      //         { a: 1, b: 2, c: 3 }
      //       ]

      //       // var options = {
      //       //   uri: 'http://openlibrary.org/search.json?author=tolkien',
      //       // };

      //       // let resp = await rp(options)

      //       // streamify(resp.docs).pipe(transformer);

      //     } catch (error) {
      //       call.emit('error', this._grpcStatusError(error.message));
      //       call.end();
      //     }
      //   }
      // });
    } catch (err) {
      call.emit('error', this._grpcStatusError(err.message));
      call.end();
    }
  }

  _grpcStatusError(message) {
    return {
      code: grpc.status.INVALID_ARGUMENT,
      message,
    };
  }

  _connectionInfoToMongoUrl(connection) {
    const connectionStringParams = this._connectionStringToParameterMap(connection.connectionString);
    const { user, password } = connection;
    const hostname = '172.22.62.129'//connectionStringParams.hostname || '172.20.0.2'//'localhost';
    const port = connectionStringParams.port || '27017';
    const database = connectionStringParams.database || 'test';
    const url = `mongodb://${user}:${password}@${hostname}:${port}/${database}`;
    return url;
  }

  _connectionStringToParameterMap(connectionString) {
    // console.log(connectionString)
    const paramEntriesArray = connectionString.split(';');
    const result = paramEntriesArray.reduce((map, paramEntry) => {
      const keyAndValueArray = paramEntry.split('=');
      if (keyAndValueArray.length === 2) {
        map[keyAndValueArray[0].trim()] = keyAndValueArray[1].trim(); // eslint-disable-line
      }
      return map;
    }, {});
    return result;
  }
}

module.exports = {
  MongoClient,
};
