const {buildSchema} = require('graphql');


module.exports = buildSchema(`
    type Post {
        _id: ID!
        title: String!
        content: String!
        imageUrl: String!
        creator: User!
        createdAt: String!
        updatedAt: String!
    }

    type PostData {
        posts: [Post!]!
        totalPosts: Int!
    }

    type User {
        _id: ID!
        email: String!
        name : String!
        password: String!
        status: String!
        posts: [Post!]!
    }

    input UserInputData {
        email: String!
        name : String!
        password: String!
    }

    type authData {
        token: String!
        userId: String!
    }

    type RootQuery {
        login (email: String!, password: String!): authData!
        posts: PostData!
    }

    type RootMutation {
        createUser(userInput: UserInputData): User!
        createPost(title: String!, content: String!, imageUrl: String!): Post!
    }

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`);