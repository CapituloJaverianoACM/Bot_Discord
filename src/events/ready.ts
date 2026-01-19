export default {
  name: ['clientReady', 'ready'],
  once: true,
  async execute(client: any) {
    console.log(`${client.user?.tag} is ready (id: ${client.user?.id})`);
  },
};
