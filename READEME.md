
# Express: Avançando com Bibliotecas de Segurança com Express

Vamos utilizar duas bibliotecas que vão servir para começar a deixar nossas API mais seguras, a bcryptjs e a jsonwebtoken (JWT).


## Desenvolvimento

Iniciaremos essa aula fazendo a instalação das duas bibliotecas que utilizaremos.

```bash
 yarn add bcryptjs@2.4.3 jsonwebtoken@8.5.1
```
ou

```bash
 npm install bcryptjs@2.4.3 jsonwebtoken@8.5.1
```
    
## Stack utilizada

**Back-end:** Node, Express, nodemon, sucrase, jsonwebtoken, uuid, bcrypt


## Bcryptjs

Ele nos permite criptografar a senha, além disso, ele também nos traz métodos que podem ser usados para comparar a senha criptografada com a senha enviada na requisição, por exemplo, em uma rota de login.

Bora botar a mão no código e ver como ele funciona.

No app.js vamos importar a função “hash” para podermos hashear (criptografar) a senha do usuário antes de salvá-lo no nosso banco de dados.
```javascript
const createUserService = async ({ email, name, password }) => {
  const foundUser = users.find((user) => user.email === email);

  if (foundUser) {
    return [409, { message: "E-mail already exists." }];
  };

  const hashedPassword = await hash(password, 10);

  const newUser = {
    id: v4(),
    email,
    name,
    password: hashedPassword
  }

  users.push(newUser);

  return [201, newUser]
};
//...
```
Precisamos reparar que tivemos que utilizar o async await. Isso se deu por conta da função hash() do bcryptjs, ela retorna uma promise, então para a nossa variável receber o valor de retorno, transformamos nossa função em uma função assíncrona e colocamos o comando de aguardar (await) antes da função de hash.

Por fim, passamos a senha criptografada como valor da senha que será salva no banco de dados.

Precisaremos também realizar uma pequena alteração no nosso controller.

Como agora nosso service é uma função assíncrona, seu retorno também será uma promise, por isso precisamos transformar nosso controller em assíncrono e mandar ele aguardar o nosso service executar.

```javascript
// src/app.js
//...
const createUserController = async (request, response) => {
  const [status, user] = await createUserService(request.body);

  return response.status(status).json(user);
};
//...
//...
```
Agora nossa senha está sendo salva criptografada, então resolvemos esse nosso problema de segurança.

Mas agora podemos ficar pensando, “mas e se eu quiser criar uma rota de login e comparar as senhas?”

É isso mesmo que faremos agora!

Mas além de só, comparar as senhas mesmo ela estando criptografada, vamos também gerar e retornar um token para o usuário, possibilitando assim criarmos rotas com proteção para o acesso apenas de usuários que efetuarem o login, ou seja, enviarem o token.

Para gerenciar nosso token utilizaremos a biblioteca jsonwebtoken.

[Documentação](https://github.com/dcodeIO/bcrypt.js#readme)

## Bcryptjs compare e jsonwebtoken

Agora com o JWT instalado, comecemos criando nosso service de login.

Dentro dele importaremos nosso banco de dados, também importamos o jwt (jsonwebtoken) e o compare do bcryptjs, que utilizaremos para comparar a senha enviada com a senha criptografada no banco de dados.

Efetuaremos então a seguinte lógica:

- Encontraremos nosso usuário na lista de usuários.
- Faremos um tratamento para retornar um feedback caso o usuário não seja encontrado.
- Faremos a comparação de senha utilizando o compare do bcryptjs, onde informamos primeiro a senha que está sendo recebida e por segundo a senha criptografada, esse método retorna um booleano.
- Criaremos o token com o jwt.sign(), esse método recebe três parâmetros, sendo eles:
  - Um objeto com uma chave e valor identificador do usuário que está criando, nesse caso estamos usando o e-mail: ele é uma informação do usuário que não pode ter dois cadastros iguais;
  - Uma string que representa a chave de segredo do nosso token, essa chave será usada pelo jsonwebtoken para criar a criptografia do token;
- Um objeto com duas chaves:
  - expiresIn: recebe uma string contendo o tempo até o token expirar;
  - subject: recebe quem é o dono do token, geralmente passamos aqui uma chave única, nesse caso poderia ser tanto o id do usuário quando o e-mail, já que ambas chaves são únicas.
- Por fim, retornaremos o token.
```javascript
// src/app.js
import jwt from "jsonwebtoken";
import { compare } from "bcryptjs";

//...
const userLoginService = async (email, password) => {
  const user = users.find((element) => element.email === email);

  if (!user) {
    return [ 401, { message: "Email ou senha inválidos" } ];
  }

  const passwordMatch = await compare(password, user.password);

  if (!passwordMatch) {
    return [ 401, { message: "Email ou senha inválidos" } ];
  }

  const token = jwt.sign(
    { email },
    "SECRET_KEY",
    { expiresIn: "24h", subject: user.id }
  );

  return [ 200, { token } ]
};
//...
```

Agora com nosso service criado, criaremos nosso controller, contendo a seguinte lógica:

```javascript
// src/app.js
//...
const userLoginController = async (request, response) => {
  const { email, password } = request.body;

  const [status, token] = await userLoginService(email, password);

  return response.status(status).json(token);
};
//...
```

Com isso, temos nossas duas primeiras rotas feitas, agora, faremos nossa última rota, ela conterá a seguinte regra: apenas usuários autenticados poderá acessar essa rota, se o usuário não for autenticado a rota retornará um erro.

Antes de fazer a criação do nosso service precisaremos entender o que é o token, já que o utilizaremos para fazer a segurança a nossa rota. Existem diversos formatos de token, mas por agora, iremos nos focar apenas no Bearer.

A estrutura dele é bem simples, ele deve ir ao cabeçalho da requisição como valor de uma chave chamada Authorization, ele deve ser do tipo string com o formato seguinte “Bearer token”, ou seja, a palavra Bearer, um espaço e o token por último.

```javascript
// src/app.js
//...
const retrieveUserService = (request) => {
  const authToken = request.headers.authorization;

  if (!authToken) {
    return [401, { message: "Missing authorization token." }];
  }

  const token = authToken.split(" ")[1];

  return jwt.verify(token, "SECRET_KEY", (error, decoded) => {
    if (error) {
      return [401, { message: error.message }];
    }

    const userId = request.params.id;
    const foundUser = users.find((user) => user.id === userId);

    return [200, foundUser];
  });
};
//...

```
Agora a criação do nosso controller:

```javascript
// src/app.js
//...

const retrieveUserController = (request, response) => {
  const [status, user] = retrieveUserService(request);

  return response.status(status).json(user);
};
//...
```
Entendamos o que nosso service está fazendo.

Primeiro realizamos a verificação se o token foi enviado na requisição do usuário, caso o token não tenha sido enviado retornamos o status code 401 com uma mensagem de erro.

Segundo, com a validação feita, pegamos o token utilizando o “split” na variável “authToken” e pegamos a segunda posição dela, fazemos isso por que estamos recebendo o token da seguinte forma: Bearer token, utilizando o “split” irá nos retornar um array de duas posições, sendo a primeira o Bearer e a segunda o token, o que queremos.

Terceiro, utilizamos a função verify do jsonwebtoken para verificar se o token recebido é um token válido, essa função recebe três parâmetros, sendo eles:

- token: o token irá ser verificado;
- secretOrPublicKey: a chave utilizada para gerar do token, essa chave tem que ser a mesma chave utilizada para gerar o token;
- callback: essa função receberá por padrão dois parâmetros, sendo eles error e decoded:
  - error: o error traz qualquer mensagem de erro caso a verificação não tenha passado;
  - decoded: traz algumas informações relacionadas ao token.
  Você pode verificar o resultado no insomnia.




